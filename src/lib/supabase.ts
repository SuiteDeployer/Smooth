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
  series_id: string
  investor_user_id: string
  assessor_user_id: string
  master_user_id: string         // ✅ Adicionado
  escritorio_user_id: string     // ✅ Adicionado
  global_user_id?: string | null // ✅ Adicionado (opcional)
  invested_amount: number
  investment_date: string
  maturity_date: string
  interest_type: string
  interest_rate: number
  commission_master: number       // ✅ Adicionado
  commission_escritorio: number   // ✅ Adicionado
  commission_assessor: number     // ✅ Adicionado
  commission_global?: number      // ✅ Adicionado (opcional)
  status: string
  contract_hash: string | null
  contract_signed_at: string | null
  auto_renewal: boolean
  created_at: string
  updated_at: string
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