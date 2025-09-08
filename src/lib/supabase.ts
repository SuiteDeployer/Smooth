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
  auth_user_id: string | null
  email: string
  full_name: string
  role_id: string
  superior_user_id: string | null
  cpf_cnpj: string | null
  phone: string | null
  pix_key: string | null
  status: string
  commission_percentage: number
  created_at: string
  updated_at: string
  user_roles?: UserRole
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
  invested_amount: number
  investment_date: string
  maturity_date: string
  interest_type: string
  interest_rate: number
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