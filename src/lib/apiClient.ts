import { supabase } from './supabase'

/**
 * Cliente robusto para Edge Functions com tratamento completo de erros
 * Versão corrigida que expõe detalhes específicos dos erros
 */
export async function invokeEdgeFunctionWithRetry(
  functionName: string, 
  payload: any = {}, 
  maxAttempts = 3
) {
  let lastErr: any = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      console.log(`📡 Invocando ${functionName} (tentativa ${attempt + 1}/${maxAttempts})`, {
        user_id: session.user?.id,
        payload_keys: Object.keys(payload)
      })

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (error) {
        console.error(`❌ ${functionName} erro bruto:`, {
          error,
          context: (error as any)?.context,
          type: typeof error,
          keys: Object.keys(error || {})
        })

        let details = 'Erro desconhecido'
        
        try {
          // SOLUÇÃO DEFINITIVA: Evitar ReadableStream completamente
          // 1. Tentar extrair da mensagem principal do erro primeiro
          if ((error as any)?.message && typeof (error as any).message === 'string') {
            details = (error as any).message
          }
          // 2. Se não tiver, tentar error_description  
          else if ((error as any)?.error_description) {
            details = (error as any).error_description
          }
          // 3. Tentar extrair do context se for string
          else if ((error as any)?.context?.body && typeof (error as any).context.body === 'string') {
            details = (error as any).context.body
          }
          // 4. Se context.body for objeto mas NÃO ReadableStream, tentar JSON.stringify
          else if ((error as any)?.context?.body && 
                   typeof (error as any).context.body === 'object' &&
                   (error as any).context.body.constructor?.name !== 'ReadableStream' &&
                   !(error as any).context.body.readable) {
            try {
              const bodyObj = (error as any).context.body
              if (bodyObj.error || bodyObj.message || bodyObj.code) {
                details = `${bodyObj.code || 'ERROR'}: ${bodyObj.error || bodyObj.message}`
              } else {
                details = JSON.stringify(bodyObj)
              }
            } catch {
              details = 'Erro no processamento de resposta da API'
            }
          }
          // 5. IGNORAR ReadableStream completamente para evitar "Body already consumed"
          else if ((error as any)?.context?.body && 
                   ((error as any).context.body.constructor?.name === 'ReadableStream' ||
                    (error as any).context.body.readable !== undefined)) {
            details = 'Erro na comunicação com o servidor - resposta inválida'
          }
          // 6. Fallback final
          else {
            details = (error as any)?.toString?.() || 'Erro não identificado'
          }
        } catch (parseErr) {
          console.error('Erro ao processar detalhes do erro:', parseErr)
          details = 'Falha na comunicação com o servidor'
        }
        
        console.error(`❌ ${functionName} erro processado:`, { details })
        
        // ERRO ESPECÍFICO EM VEZ DE GENÉRICO
        throw new Error(`ERRO DETALHADO: ${details}`)
      }

      // Verificar se a função retornou erro estruturado
      if (data?.ok === false || data?.error) {
        const errorMsg = data?.error || 'Erro desconhecido na função'
        const errorCode = data?.code || 'UNKNOWN_ERROR'
        
        console.error(`❌ ${functionName} retornou erro:`, { data })
        
        // Retornar erro estruturado para o frontend processar
        throw new Error(`[${errorCode}] ${errorMsg}`)
      }

      console.log(`✅ ${functionName} executado com sucesso`)
      return data
      
    } catch (e: any) {
      lastErr = e
      
      // Não fazer retry para erros específicos
      const noRetryErrors = [
        'EMAIL_EXISTS',
        'AUTH_ADMIN_ERROR',
        'email address has already been registered',
        'VALIDATION_FAILED', 
        'INVALID_ROLE',
        'Sessão expirada',
        'AUTH_MISSING'
      ]
      
      const shouldNotRetry = noRetryErrors.some(errorType => 
        e.message?.includes(errorType)
      )
      
      if (shouldNotRetry || attempt === maxAttempts - 1) {
        console.error(`💥 ${functionName} falha final:`, e.message)
        break
      }
      
      // Backoff exponencial: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000
      console.warn(`⚠️ ${functionName} tentativa ${attempt + 1} falhou, retry em ${delay}ms:`, e.message)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  
  throw lastErr
}

/**
 * Versão simplificada sem retry (para casos específicos)
 */
export const invokeEdgeFunction = async (functionName: string, payload: any = {}) => {
  return invokeEdgeFunctionWithRetry(functionName, payload, 1)
}

/**
 * Wrapper específico para criação de usuários com tratamento de erro melhorado
 */
export const createUserRobust = async (userData: any) => {
  try {
    console.log('🔧 Criando usuário com dados:', userData)
    
    const result = await invokeEdgeFunctionWithRetry('create-user-v2', userData)
    
    if (result?.data?.user_id) {
      console.log('✅ Usuário criado com sucesso:', result.data.user_id)
      return result.data
    }
    
    throw new Error('Resposta inválida da função de criação')
    
  } catch (error: any) {
    console.error('💥 Erro na criação de usuário:', error.message)
    
    // Mapear erros específicos para mensagens amigáveis
    if (error.message?.includes('EMAIL_EXISTS') || error.message?.includes('AUTH_ADMIN_ERROR')) {
      throw new Error('Este email já está cadastrado no sistema.')
    }
    
    if (error.message?.includes('email address has already been registered')) {
      throw new Error('Este email já está cadastrado no sistema.')
    }
    
    if (error.message?.includes('VALIDATION_FAILED')) {
      throw new Error('Dados obrigatórios não foram preenchidos corretamente.')
    }
    
    if (error.message?.includes('INVALID_ROLE')) {
      throw new Error('Tipo de usuário inválido selecionado.')
    }
    
    if (error.message?.includes('PROFILE_INSERT_ERROR')) {
      throw new Error('Erro ao criar perfil do usuário. Verifique as informações e tente novamente.')
    }
    
    // Erro genérico (manter mensagem original para debug)
    throw new Error(`Erro ao criar usuário: ${error.message}`)
  }
}

/**
 * Teste de diagnóstico para verificar conectividade com Edge Functions
 */
export const testEdgeFunctionConnectivity = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado')
    }
    
    console.log('🔍 Testando conectividade com Edge Functions...')
    
    // Teste simples para verificar se as funções respondem
    const testPayload = {
      email: 'teste.conectividade@exemplo.com',
      full_name: 'Teste Conectividade',
      role_name: 'Master'
    }
    
    const response = await supabase.functions.invoke('create-user-v2', {
      body: testPayload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })
    
    console.log('🔍 Resposta do teste:', response)
    
    return {
      success: !response.error,
      response,
      message: response.error ? 'Edge Function com erro (esperado para teste)' : 'Edge Function respondendo'
    }
    
  } catch (error) {
    console.error('🔍 Erro no teste de conectividade:', error)
    return {
      success: false,
      error,
      message: 'Falha na conectividade com Edge Functions'
    }
  }
}