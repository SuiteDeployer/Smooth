// CRUD Operations Simples - Sem Complexidade Desnecessária
import { supabase } from './supabase'

class SimpleCRUDManager {
  private static instance: SimpleCRUDManager
  private baseUrl = 'https://cisoewbdzdxombthxqfi.supabase.co'

  static getInstance(): SimpleCRUDManager {
    if (!SimpleCRUDManager.instance) {
      SimpleCRUDManager.instance = new SimpleCRUDManager()
    }
    return SimpleCRUDManager.instance
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('Erro ao obter token:', error)
      return null
    }
  }

  // INVESTIMENTOS - Operação Simples
  async createInvestment(data: {
    series_id: string
    investor_user_id: string
    invested_amount: number
    interest_type: 'simple' | 'compound'
  }): Promise<any> {
    const token = await this.getAuthToken()
    if (!token) throw new Error('Token não encontrado')

    const response = await fetch(`${this.baseUrl}/functions/v1/investment-management-simple?action=create_investment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Erro ao criar investimento')
    }

    return response.json()
  }

  // USUÁRIOS - Operação Simples
  async createUser(data: {
    email: string
    full_name: string
    role_name: string
    cpf_cnpj?: string
    phone?: string
    commission_percentage?: number
  }): Promise<any> {
    const token = await this.getAuthToken()
    if (!token) throw new Error('Token não encontrado')

    const response = await fetch(`${this.baseUrl}/functions/v1/user-management?action=create_user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Erro ao criar usuário')
    }

    return response.json()
  }

  // NOTIFICAÇÕES - Operação Simples
  async createNotification(data: {
    recipient_user_id: string
    alert_type: string
    title: string
    message: string
    related_entity_type?: string
    related_entity_id?: string
  }): Promise<any> {
    try {
      const { data: notification, error } = await supabase
        .from('alerts_notifications')
        .insert({
          ...data,
          severity: 'info',
          is_read: false
        })
        .select()
        .single()

      if (error) throw error

      console.log('✅ Notificação criada:', notification)
      return notification
    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error)
      throw error
    }
  }
}

export const simpleCrudManager = SimpleCRUDManager.getInstance()
export default simpleCrudManager
