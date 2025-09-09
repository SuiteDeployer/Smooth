import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { invokeEdgeFunctionWithRetry, createUserRobust } from '../lib/apiClient'

interface CreateUserData {
  email: string
  full_name: string
  role_name: string
  cpf_cnpj?: string
  phone?: string
  company_name?: string
  commission_percentage?: number
  superior_user_id?: string
  pix_key?: string
  pix_key_type?: string
  status?: string
}

interface Role {
  id: string
  role_name: string
  hierarchy_level: number
}

interface User {
  id: string
  full_name: string
  email: string
  cpf_cnpj?: string
  phone?: string
  pix_key?: string
  pix_key_type?: string
  status: string
  created_at: string
  user_roles?: any
  role_name?: string
  hierarchy_level?: number
  company_name?: string
  superior_user_id?: string
  can_edit?: boolean
  can_delete?: boolean
  level_depth?: number
}

// Estados de carregamento específicos para cada operação
interface LoadingStates {
  createUser: boolean
  updateUser: boolean
  deleteUser: boolean
  fetchRoles: boolean
  fetchSubordinates: boolean
}

interface ErrorStates {
  createUser: string | null
  updateUser: string | null
  deleteUser: string | null
  fetchRoles: string | null
  fetchSubordinates: string | null
}

// Configuração de retry
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 5000   // 5 segundos máximo
}

export function useUserManagement() {
  const { user } = useAuth()
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [subordinatesData, setSubordinatesData] = useState<User[]>([])
  
  // Estados de loading individualizados
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    createUser: false,
    updateUser: false,
    deleteUser: false,
    fetchRoles: false,
    fetchSubordinates: false
  })
  
  // Estados de erro individualizados
  const [errorStates, setErrorStates] = useState<ErrorStates>({
    createUser: null,
    updateUser: null,
    deleteUser: null,
    fetchRoles: null,
    fetchSubordinates: null
  })
  
  // Função utilitária para atualizar loading state
  const setLoadingState = useCallback((operation: keyof LoadingStates, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [operation]: isLoading }))
  }, [])
  
  // Função utilitária para atualizar error state
  const setErrorState = useCallback((operation: keyof ErrorStates, error: string | null) => {
    setErrorStates(prev => ({ ...prev, [operation]: error }))
  }, [])
  
  // Função para delay com backoff exponencial
  const delay = (attempt: number) => {
    const backoffDelay = Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, attempt), RETRY_CONFIG.maxDelay)
    return new Promise(resolve => setTimeout(resolve, backoffDelay))
  }
  
  // Função para validar token de autenticação
  const validateAuthToken = async (): Promise<boolean> => {
    try {
      if (!user) {
        console.warn('🔒 Usuário não autenticado')
        return false
      }
      
      // Verificar se o token ainda é válido fazendo uma chamada simples
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.access_token) {
        console.warn('🔒 Token de autenticação inválido ou expirado:', error?.message)
        return false
      }
      
      // Verificar se o token expira em menos de 5 minutos
      const now = Date.now() / 1000
      const tokenExp = session.expires_at || 0
      
      if (tokenExp - now < 300) { // 5 minutos
        console.warn('🔒 Token expirará em breve, tentando renovação...')
        
        // Tentar refresh do token
        try {
          const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError || !newSession) {
            console.error('🔒 Falha ao renovar token:', refreshError?.message)
            return false
          }
          console.log('✅ Token renovado com sucesso')
        } catch (refreshErr) {
          console.error('🔒 Erro ao tentar renovar token:', refreshErr)
          return false
        }
      }
      
      // Teste adicional: verificar se conseguimos fazer uma chamada simples
      try {
        const { error: testError } = await supabase.from('users').select('id').limit(1)
        if (testError) {
          console.warn('🔒 Token válido mas sem permissões adequadas:', testError.message)
          return false
        }
      } catch (testErr) {
        console.warn('🔒 Erro ao testar permissões do token:', testErr)
        return false
      }
      
      console.log('✅ Token de autenticação válido e funcional')
      return true
    } catch (error) {
      console.error('🔒 Erro ao validar token:', error)
      return false
    }
  }
  
  // Função genérica para retry com backoff
  const withRetry = async <T>(
    operation: () => Promise<T>,
    operationName: string,
    maxAttempts: number = RETRY_CONFIG.maxAttempts
  ): Promise<T> => {
    let lastError: Error
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`🔄 ${operationName} - Tentativa ${attempt + 1}/${maxAttempts}`)
        return await operation()
      } catch (error: any) {
        lastError = error
        
        // Não fazer retry para erros 4xx (exceto 408, 429)
        if (error.message && /4[0-9][0-9]/.test(error.message)) {
          const is408or429 = error.message.includes('408') || error.message.includes('429')
          if (!is408or429) {
            console.warn(`❌ ${operationName} - Erro 4xx, não fará retry:`, error.message)
            throw error
          }
        }
        
        // Para o último attempt, não esperar
        if (attempt === maxAttempts - 1) {
          console.error(`❌ ${operationName} - Todas as tentativas falharam:`, error.message)
          break
        }
        
        console.warn(`⚠️ ${operationName} - Tentativa ${attempt + 1} falhou, tentando novamente em ${RETRY_CONFIG.baseDelay * Math.pow(2, attempt)}ms:`, error.message)
        await delay(attempt)
      }
    }
    
    throw lastError!
  }

  // Buscar papéis disponíveis baseado no role do usuário atual
  const fetchRoles = async () => {
    if (!user) return
    
    try {
      setLoadingState('fetchRoles', true)
      setErrorState('fetchRoles', null)
      
      // Obter o role do usuário atual
      const { data: currentUserData, error: userError } = await supabase
        .from('users')
        .select(`
          user_roles (
            role_name,
            hierarchy_level
          )
        `)
        .eq('auth_user_id', user.id)
        .single()

      if (userError) throw userError

      const userRoles = currentUserData?.user_roles
      const currentUserRole = Array.isArray(userRoles) ? 
        userRoles[0]?.role_name : 
        (userRoles as any)?.role_name
      const currentUserLevel = Array.isArray(userRoles) ? 
        userRoles[0]?.hierarchy_level : 
        (userRoles as any)?.hierarchy_level

      // Buscar todos os papéis
      const { data: allRoles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('hierarchy_level')

      if (error) throw error

      // Filtrar papéis baseado na hierarquia
      let availableRoles = allRoles || []

      if (currentUserRole !== 'Global') {
        // Não-Global só pode criar usuários de níveis hierárquicos maiores (mais baixos na hierarquia)
        availableRoles = availableRoles.filter(role => 
          role.hierarchy_level > currentUserLevel
        )
      }
      // Global pode criar qualquer papel, incluindo outros Global

      console.log('✅ Papéis disponíveis para', currentUserRole, ':', availableRoles.map(r => r.role_name))
      setAvailableRoles(availableRoles)
    } catch (err: any) {
      console.error('❌ Erro ao buscar papéis:', err)
      setErrorState('fetchRoles', err.message)
    } finally {
      setLoadingState('fetchRoles', false)
    }
  }

  // Buscar usuários que o usuário atual pode gerenciar baseado na hierarquia
  const fetchSubordinates = async () => {
    if (!user) return
    
    try {
      setLoadingState('fetchSubordinates', true)
      setErrorState('fetchSubordinates', null)
      
      // Primeiro, obter o role do usuário atual
      const { data: currentUserData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          user_roles (
            role_name,
            hierarchy_level
          )
        `)
        .eq('auth_user_id', user.id)
        .single()

      if (userError) throw userError

      const userRoles = currentUserData?.user_roles
      const currentUserRole = Array.isArray(userRoles) ? 
        userRoles[0]?.role_name : 
        (userRoles as any)?.role_name
      const currentUserId = currentUserData?.id

      console.log('🔍 Usuário atual:', { role: currentUserRole, id: currentUserId })

      let users: any[] = []

      if (currentUserRole === 'Global') {
        // Global pode ver todos os usuários - QUERY DIRETA (sem RPC problemática)
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            email,
            full_name,
            cpf_cnpj,
            phone,
            status,
            company_name,
            superior_user_id,
            pix,
            pix_key_type,
            created_at,
            updated_at,
            role_id,
            user_roles!inner (
              role_name,
              hierarchy_level
            )
          `)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('❌ Erro na query direta:', error)
          throw error
        }
        
        console.log('🔍 DADOS BRUTOS DA QUERY:', data)
        
        // Para Global, todos podem ser editados/deletados
        users = (data || []).map((user: any) => ({
          user_id: user.id,
          email: user.email,
          full_name: user.full_name,
          role_name: user.user_roles?.role_name,
          hierarchy_level: user.user_roles?.hierarchy_level,
          company_name: user.company_name,
          superior_user_id: user.superior_user_id,
          cpf_cnpj: user.cpf_cnpj,
          phone: user.phone,
          status: user.status,
          pix_key: user.pix_key,
          pix_key_type: user.pix_key_type,
          created_at: user.created_at,
          level_depth: 0,
          can_edit: true,
          can_delete: true,
          id: user.id,
          user_roles: { role_name: user.user_roles?.role_name }
        }))
        
        console.log('🔍 USUÁRIOS PROCESSADOS:', users?.length || 0)
      } else {
        // Para outros roles, usar a função de descendentes
        const { data, error } = await supabase.rpc('get_user_descendants', {
          input_user_id: currentUserId
        })
        if (error) throw error

        // Determinar permissões baseadas na hierarquia
        users = (data || []).map((user: any) => {
          const canEdit = currentUserRole === 'Global' || 
                         (user.level_depth > 0) // Pode editar subordinados
          const canDelete = currentUserRole === 'Global' || 
                           (user.level_depth > 0 && currentUserRole !== 'Investidor')
          
          return {
            ...user,
            can_edit: canEdit,
            can_delete: canDelete,
            id: user.user_id,
            user_roles: { role_name: user.role_name }
          }
        })
      }

      console.log('✅ Usuários gerenciáveis carregados:', users?.length || 0)
      console.log('📊 Detalhes dos usuários:', users.map(u => ({ 
        email: u.email, 
        role: u.role_name, 
        can_edit: u.can_edit, 
        can_delete: u.can_delete 
      })))
      
      setSubordinatesData(users || [])
    } catch (err: any) {
      console.error('❌ Erro ao buscar usuários gerenciáveis:', err)
      setErrorState('fetchSubordinates', err.message)
    } finally {
      setLoadingState('fetchSubordinates', false)
    }
  }

  // Deletar usuário via edge function com verificação de permissões
  const deleteUser = async (userId: string) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoadingState('deleteUser', true)
      setErrorState('deleteUser', null)
      
      console.log('🗑️ Deletando usuário via edge function:', userId)
      
      // Chamar a edge function para deletar o usuário (que verifica permissões)
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      })

      if (error) {
        console.error('❌ Erro da edge function de delete:', error)
        throw new Error(`Erro ao deletar usuário: ${error.message}`)
      }

      if (data?.error) {
        console.error('❌ Erro retornado pela edge function de delete:', data.error)
        throw new Error(`Erro ao deletar usuário: ${data.error.message}`)
      }
      
      console.log('✅ Usuário deletado com sucesso via edge function')
      
      // Atualizar lista de subordinados
      await fetchSubordinates()
    } catch (err: any) {
      console.error('❌ Erro:', err)
      setErrorState('deleteUser', err.message)
      throw err
    } finally {
      setLoadingState('deleteUser', false)
    }
  }

  // Atualizar usuário via edge function com verificação de permissões
  const updateUser = async (userId: string, updates: Partial<CreateUserData>) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoadingState('updateUser', true)
      setErrorState('updateUser', null)
      
      console.log('🔄 Atualizando usuário via edge function:', userId, updates)
      
      // Chamar a edge function para atualizar o usuário (que verifica permissões)
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: { 
          user_id: userId,
          updates: {
            email: updates.email,
            full_name: updates.full_name,
            cpf_cnpj: updates.cpf_cnpj,
            phone: updates.phone,
            company_name: updates.company_name,
            pix_key: updates.pix_key,
            pix_key_type: updates.pix_key_type,
            status: updates.status
          }
        }
      })

      if (error) {
        console.error('❌ Erro da edge function de update:', error)
        throw new Error(`Erro ao atualizar usuário: ${error.message}`)
      }

      if (data?.error) {
        console.error('❌ Erro retornado pela edge function de update:', data.error)
        throw new Error(`Erro ao atualizar usuário: ${data.error.message}`)
      }
      
      console.log('✅ Usuário atualizado com sucesso via edge function:', data)
      
      // Atualizar lista de subordinados
      await fetchSubordinates()
      
      return data.data
    } catch (err: any) {
      console.error('❌ Erro:', err)
      setErrorState('updateUser', err.message)
      throw err
    } finally {
      setLoadingState('updateUser', false)
    }
  }

  // Verificar se o usuário atual pode gerenciar um usuário específico
  const canManageUser = async (targetUserId: string): Promise<boolean> => {
    if (!user) return false
    
    try {
      const { data: currentUserData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!currentUserData) return false

      const { data, error } = await supabase.rpc('can_user_manage_target', {
        manager_user_id: currentUserData.id,
        target_user_id: targetUserId
      })

      if (error) {
        console.error('❌ Erro ao verificar permissões:', error)
        return false
      }

      return data || false
    } catch (err) {
      console.error('❌ Erro ao verificar permissões:', err)
      return false
    }
  }

  // Criar usuário usando a Edge Function robusta com tratamento completo de erros
  const createUser = async (userData: CreateUserData) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    // Limpar erro anterior
    setErrorState('createUser', null)
    setLoadingState('createUser', true)
    
    try {
      console.log('🚀 Iniciando criação de usuário com wrapper robusto:', userData)
      
      // Validar token antes de prosseguir
      const isTokenValid = await validateAuthToken()
      if (!isTokenValid) {
        throw new Error('Token de autenticação inválido ou expirado. Faça login novamente.')
      }
      
      // Preparar dados para a Edge Function
      const edgeFunctionData = {
        email: userData.email,
        full_name: userData.full_name,
        role_name: userData.role_name, // mantém case original
        cpf_cnpj: userData.cpf_cnpj || null,
        phone: userData.phone || null,
        company_name: userData.company_name || null,
        superior_user_id: userData.superior_user_id || null,
        status: userData.status || 'active',
        pix_key: userData.pix_key || null, // CORREÇÃO: usar apenas pix_key
        pix_key_type: userData.pix_key_type || null
      }
      
      console.log('🔧 Usando wrapper robusto createUserRobust')
      
      // USAR O NOVO WRAPPER ROBUSTO QUE EXPÕE ERROS DETALHADOS
      const result = await createUserRobust(edgeFunctionData)
      
      console.log('✅ Usuário criado com sucesso:', result)
      
      // Atualizar lista de subordinados após sucesso
      console.log('🔄 Atualizando lista de subordinados...')
      await fetchSubordinates()
      
      return {
        data: {
          message: result.message || 'Usuário criado com sucesso',
          userId: result.user_id,
          email: result.email,
          role_name: result.role_name,
          temporaryPassword: result.temporaryPassword,
          user: {
            id: result.user_id,
            email: result.email,
            full_name: userData.full_name,
            role_name: result.role_name
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Erro final na criação de usuário:', err)
      
      // Categorizar erro para melhor feedback
      let finalErrorMessage = err.message
      if (err.message?.includes('autenticação') || err.message?.includes('token')) {
        finalErrorMessage = 'Problema de autenticação. Token inválido ou expirado. Faça login novamente.'
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        finalErrorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.'
      } else if (err.message?.includes('User not allowed')) {
        finalErrorMessage = 'Erro de permissão. Usuário não autorizado para esta operação.'
      }
      
      setErrorState('createUser', finalErrorMessage)
      
      // NÃO atualizar lista em caso de erro
      console.warn('⚠️ Lista de subordinados NÃO foi atualizada devido ao erro na criação')
      
      throw new Error(finalErrorMessage)
    } finally {
      setLoadingState('createUser', false)
    }
  }

  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      fetchRoles()
      fetchSubordinates()
    }
  }, [user])

  return {
    // Dados com estados individualizados
    availableRoles: { 
      data: availableRoles, 
      isLoading: loadingStates.fetchRoles, 
      error: errorStates.fetchRoles 
    },
    subordinates: { 
      data: subordinatesData, 
      isLoading: loadingStates.fetchSubordinates, 
      error: errorStates.fetchSubordinates 
    },
    
    // Ações com estados individualizados (padrão react-query-like)
    createUser: { 
      mutateAsync: createUser, 
      isLoading: loadingStates.createUser,
      error: errorStates.createUser,
      reset: () => setErrorState('createUser', null)
    },
    updateUser: { 
      mutateAsync: updateUser, 
      isLoading: loadingStates.updateUser,
      error: errorStates.updateUser,
      reset: () => setErrorState('updateUser', null)
    },
    deleteUser: { 
      mutateAsync: deleteUser, 
      isLoading: loadingStates.deleteUser,
      error: errorStates.deleteUser,
      reset: () => setErrorState('deleteUser', null)
    },
    
    // Funções de permissão
    canManageUser,
    
    // Funções auxiliares
    refetch: () => {
      fetchRoles()
      fetchSubordinates()
    },
    
    // Estados combinados para compatibilidade
    isLoading: Object.values(loadingStates).some(Boolean),
    hasError: Object.values(errorStates).some(Boolean),
    
    // Função para limpar todos os erros
    clearAllErrors: () => {
      setErrorStates({
        createUser: null,
        updateUser: null,
        deleteUser: null,
        fetchRoles: null,
        fetchSubordinates: null
      })
    }
  }
}
