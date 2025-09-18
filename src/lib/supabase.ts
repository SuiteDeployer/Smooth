import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase usando variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 Variáveis de ambiente do Supabase não configuradas!')
  console.error('VITE_SUPABASE_URL:', supabaseUrl)
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Configurada' : 'Não configurada')
  throw new Error('Variáveis de ambiente do Supabase não configuradas. Verifique o arquivo .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos TypeScript para o banco de dados
export interface User {
  id: string
  email: string
  name: string
  full_name?: string // Alias for name for compatibility
  user_type: string
  parent_id: string | null
  phone: string | null
  document: string | null
  cpf: string | null
  pix: string | null
  cpf_cnpj?: string | null // Alias for document for compatibility
  status: string
  created_at: string
  updated_at: string
  created_by: string | null
  user_roles?: {
    id: string
    role_name: string
    hierarchy_level: number
  } | null
}

export interface UserRole {
  id: string
  role_name: string
  hierarchy_level: number
  can_create_roles: string[]
  max_subordinate_level: number
  created_at: string
}

export interface Debenture {
  id: string
  name: string
  description: string | null
  issuer_name: string
  total_emission_value: number
  emission_date: string
  created_by: string
  status: string
  terms_and_conditions: string | null
  created_at: string
  updated_at: string
}

export interface Series {
  id: string
  debenture_id: string
  series_code: string
  name: string
  description: string | null
  minimum_investment: number
  maximum_investment: number | null
  maturity_period_months: number
  interest_rate: number
  interest_type: string
  max_commission_percentage: number
  max_total_captation: number | null
  current_captation: number
  status: string
  created_at: string
  updated_at: string
}

export interface Investment {
  id: string
  debenture_id: string
  series_id: string
  investor_user_id: string
  head_user_id: string
  escritorio_user_id: string
  master_user_id: string
  agente_user_id: string | null  // ✅ CORRIGIDO: Campo adicionado conforme estrutura real do banco
  global_user_id?: string | null
  investment_amount: number
  investment_date: string
  maturity_date: string
  head_commission_percentage: number
  escritorio_commission_percentage: number
  master_commission_percentage: number
  head_commission_amount: number
  escritorio_commission_amount: number
  master_commission_amount: number
  agente_commission_percentage?: number  // ✅ ADICIONADO: Para suporte completo ao agente
  agente_commission_amount?: number      // ✅ ADICIONADO: Para suporte completo ao agente
  status: string
  contract_hash: string | null
  contract_signed_at: string | null
  auto_renewal: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Commission {
  id: string
  investment_id: string
  hierarchy_tracking_id: string
  recipient_user_id: string
  commission_percentage: number
  commission_amount: number
  commission_type: string
  payment_status: string
  paid_at: string | null
  created_at: string
}

export interface Remuneration {
  id: string
  investment_id: number
  investor_user_id: string
  remuneration_amount: number
  remuneration_date: string
  status: string
  created_at: string
  updated_at: string
}

export interface AlertNotification {
  id: string
  recipient_user_id: string
  alert_type: string
  title: string
  message: string
  related_entity_type: string | null
  related_entity_id: string | null
  is_read: boolean
  severity: string
  created_at: string
}

// ========================================
// FUNÇÕES AUXILIARES PARA RLS HIERÁRQUICO
// ========================================

/**
 * Identifica o Master da rede do usuário
 * Retorna null para Global (vê tudo)
 * Retorna próprio ID para Master
 * Para outros tipos, sobe na hierarquia até encontrar o Master
 */
export const getUserNetworkMaster = async (userId: string): Promise<string | null> => {
  try {
    // Buscar usuário atual
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_type, parent_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('Erro ao buscar usuário:', userError)
      return null
    }

    // Global vê tudo
    if (user.user_type === 'Global') {
      return null
    }

    // Master retorna próprio ID
    if (user.user_type === 'Master') {
      return userId
    }

    // Para outros tipos, buscar Master na hierarquia
    let currentUserId = userId
    let currentParentId = user.parent_id
    let attempts = 0
    const maxAttempts = 10 // Limite de segurança

    while (currentParentId && attempts < maxAttempts) {
      const { data: parentUser, error: parentError } = await supabase
        .from('users')
        .select('user_type, parent_id')
        .eq('id', currentParentId)
        .single()

      if (parentError || !parentUser) {
        console.error('Erro ao buscar usuário pai:', parentError)
        break
      }

      if (parentUser.user_type === 'Master') {
        return currentParentId
      }

      currentParentId = parentUser.parent_id
      attempts++
    }

    return null
  } catch (error) {
    console.error('Erro na função getUserNetworkMaster:', error)
    return null
  }
}

/**
 * Verifica se o usuário está no split do investimento
 */
export const userInInvestmentSplit = (userId: string, investment: Investment): boolean => {
  return (
    investment.master_user_id === userId ||
    investment.escritorio_user_id === userId ||
    investment.head_user_id === userId ||
    investment.agente_user_id === userId ||  // ✅ CORRIGIDO: Campo agora existe
    investment.investor_user_id === userId
  )
}

/**
 * Verifica se o usuário pode ver o investimento (com isolamento de rede)
 */
export const canViewInvestment = async (userId: string, investment: Investment): Promise<boolean> => {
  try {
    // Buscar tipo do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return false
    }

    // Global vê tudo
    if (user.user_type === 'Global') {
      return true
    }

    // Verificar se está na mesma rede
    const userNetwork = await getUserNetworkMaster(userId)
    const investmentNetwork = await getUserNetworkMaster(investment.master_user_id)

    // Se não está na mesma rede, não pode ver
    if (userNetwork !== investmentNetwork) {
      return false
    }

    // Master: vê investimentos que cria (onde ele é o master)
    if (user.user_type === 'Master') {
      return investment.master_user_id === userId
    }

    // Outros tipos: vê apenas onde está no split
    return userInInvestmentSplit(userId, investment)
  } catch (error) {
    console.error('Erro na função canViewInvestment:', error)
    return false
  }
}

/**
 * Hook para controlar acesso a módulos baseado no tipo de usuário
 */
export const getModuleAccess = (userType: string | undefined) => {
  return {
    canAccessDebentures: userType !== 'Investidor',
    canAccessSeries: userType !== 'Investidor',
    canAccessCommissions: userType !== 'Investidor',
    canAccessRemunerations: true, // Todos podem acessar (com controles RLS específicos)
    canCreateInvestments: ['Global', 'Master', 'Escritório', 'Head'].includes(userType || ''),
    canEditInvestments: ['Global', 'Master'].includes(userType || ''),
    canDeleteInvestments: ['Global', 'Master'].includes(userType || ''),
    canCreateDebentures: userType === 'Global',
    canEditDebentures: userType === 'Global',
    canDeleteDebentures: userType === 'Global',
    canCreateSeries: userType === 'Global',
    canEditSeries: userType === 'Global',
    canDeleteSeries: userType === 'Global'
  }
}
