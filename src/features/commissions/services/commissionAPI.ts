import { supabase } from '../../../lib/supabase'
import type {
  CommissionPayment,
  CommissionSummary,
  CommissionMonthlySummary,
  CommissionExport,
  CommissionProfile,
  CommissionFilters,
  ExportRequest,
  ImportRequest,
  ReportRequest
} from '../types/commission.types'

class CommissionAPI {
  /**
   * Buscar resumo geral de comissões
   */
  async getSummary(): Promise<CommissionSummary> {
    const { data, error } = await supabase
      .from('commission_monthly_summary')
      .select('*')
      .single()
    
    if (error) {
      console.error('Erro ao buscar resumo:', error)
      throw new Error('Erro ao buscar resumo de comissões')
    }
    
    return data
  }

  /**
   * Buscar resumo mensal de comissões (últimos 6 meses)
   */
  async getMonthlySummary(): Promise<CommissionMonthlySummary[]> {
    const { data, error } = await supabase
      .from('commission_monthly_summary')
      .select('*')
      .order('payment_month', { ascending: false })
      .limit(6)
    
    if (error) {
      console.error('Erro ao buscar resumo mensal:', error)
      throw new Error('Erro ao buscar resumo mensal')
    }
    
    return data || []
  }

  /**
   * Buscar comissões vencidas
   */
  async getOverdueCommissions(): Promise<CommissionPayment[]> {
    const { data, error } = await supabase
      .from('commission_overdue')
      .select('*')
      .order('due_date', { ascending: true })
      .limit(50)
    
    if (error) {
      console.error('Erro ao buscar comissões vencidas:', error)
      throw new Error('Erro ao buscar comissões vencidas')
    }
    
    return data || []
  }

  /**
   * Buscar comissões com filtros
   */
  async getCommissions(filters: CommissionFilters & { page?: number; limit?: number }): Promise<{
    data: CommissionPayment[]
    total: number
    page: number
    totalPages: number
  }> {
    const { page = 1, limit = 50, ...commissionFilters } = filters
    const offset = (page - 1) * limit

    let query = supabase.from('commission_schedules').select(`
      id,
      monthly_amount,
      status,
      payment_month,
      installment_number,
      total_installments,
      commission_percentage,
      created_at,
      recipient_role,
      recipient_user:recipient_user_id(full_name, pix_key, pix_key_type),
      investment:investment_id(
        id,
        invested_amount,
        investment_date,
        investor:investor_user_id(full_name),
        assessor:assessor_user_id(full_name),
        series:series_id(name, series_code)
      )
    `, { count: 'exact' })

    // Aplicar filtros
    if (commissionFilters.month && commissionFilters.year) {
      const startDate = `${commissionFilters.year}-${String(commissionFilters.month).padStart(2, '0')}-01`
      const endDate = `${commissionFilters.year}-${String((commissionFilters.month % 12) + 1).padStart(2, '0')}-01`
      query = query.gte('payment_month', startDate).lt('payment_month', endDate)
    }

    if (commissionFilters.status && commissionFilters.status.length > 0) {
      query = query.in('status', commissionFilters.status)
    }

    if (commissionFilters.role && commissionFilters.role.length > 0) {
      query = query.in('recipient_role', commissionFilters.role)
    }

    if (commissionFilters.series && commissionFilters.series.length > 0) {
      query = query.in('series_code', commissionFilters.series)
    }

    if (commissionFilters.minAmount) {
      query = query.gte('amount', commissionFilters.minAmount)
    }

    if (commissionFilters.maxAmount) {
      query = query.lte('amount', commissionFilters.maxAmount)
    }

    if (commissionFilters.dateFrom) {
      query = query.gte('created_at', commissionFilters.dateFrom)
    }

    if (commissionFilters.dateTo) {
      query = query.lte('created_at', commissionFilters.dateTo)
    }

    const { data, error, count } = await query
      .order('payment_month', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Erro ao buscar comissões:', error)
      throw new Error('Erro ao buscar comissões')
    }

    return {
      data: data?.map((commission: any) => ({
        payment_id: `CS-${commission.id}`,
        recipient_name: commission.recipient_user?.full_name || 'N/A',
        recipient_role: commission.recipient_role,
        series_code: commission.investment?.series?.series_code || 'N/A',
        amount: parseFloat(commission.monthly_amount || 0),
        pix_key_type: commission.recipient_user?.pix_key_type || '',
        pix_key: commission.recipient_user?.pix_key || '',
        status: commission.status as 'PAGO' | 'PENDENTE' | 'CANCELADO' | 'VENCIDA',
        payment_month: commission.payment_month,
        due_date: commission.payment_month, // Usando o mesmo valor
        payment_date: commission.status === 'PAGO' ? commission.created_at : undefined,
        commission_schedule_id: commission.id,
        investment_id: commission.investment?.id || '',
        notes: '',
        created_at: commission.created_at,
        updated_at: commission.created_at
      })) || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    }
  }

  /**
   * Exportar comissões para CSV
   */
  async exportCommissions(request: ExportRequest): Promise<{
    csv_content: string
    total_records: number
    total_amount: number
    file_name: string
  }> {
    const { data, error } = await supabase.functions.invoke('export-commissions', {
      body: request
    })

    if (error) {
      console.error('Erro na exportação:', error)
      throw new Error(`Erro ao exportar comissões: ${error.message}`)
    }

    return data.data
  }

  /**
   * Importar status de comissões
   */
  async importCommissions(request: ImportRequest): Promise<{
    success: boolean
    processed: number
    errors: number
    message: string
  }> {
    const { data, error } = await supabase.functions.invoke('import-commissions', {
      body: request
    })

    if (error) {
      console.error('Erro na importação:', error)
      throw new Error(`Erro ao importar comissões: ${error.message}`)
    }

    return data
  }

  /**
   * Buscar histórico de exportações
   */
  async getExportHistory(): Promise<CommissionExport[]> {
    const { data, error } = await supabase
      .from('commission_exports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Erro ao buscar histórico:', error)
      throw new Error('Erro ao buscar histórico de exportações')
    }

    return data || []
  }

  /**
   * Buscar perfis de comissão (apenas Global)
   */
  async getCommissionProfiles(): Promise<CommissionProfile[]> {
    const { data, error } = await supabase
      .from('commission_profiles')
      .select(`
        *,
        series:series_id (
          name,
          series_code
        )
      `)
      .order('series_id', { ascending: true })

    if (error) {
      console.error('Erro ao buscar perfis:', error)
      throw new Error('Erro ao buscar perfis de comissão')
    }

    return data || []
  }

  /**
   * Atualizar perfil de comissão
   */
  async updateCommissionProfile(profileId: string, percentage: number): Promise<CommissionProfile> {
    const { data, error } = await supabase
      .from('commission_profiles')
      .update({ commission_percentage: percentage, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .select(`
        *,
        series:series_id (
          name,
          series_code
        )
      `)
      .single()

    if (error) {
      console.error('Erro ao atualizar perfil:', error)
      throw new Error('Erro ao atualizar perfil de comissão')
    }

    return data
  }

  /**
   * Gerar relatórios
   */
  async generateReport(request: ReportRequest): Promise<any> {
    const { data, error } = await supabase.functions.invoke('commission-reports', {
      body: request
    })

    if (error) {
      console.error('Erro na geração de relatório:', error)
      throw new Error(`Erro ao gerar relatório: ${error.message}`)
    }

    return data
  }

  /**
   * Buscar estatísticas por hierarquia
   */
  async getHierarchyStats(): Promise<Array<{
    role_name: string
    total_amount: number
    total_count: number
    avg_amount: number
  }>> {
    const { data, error } = await supabase
      .from('commission_schedules')
      .select('recipient_role, monthly_amount')

    if (error) {
      console.error('Erro ao buscar estatísticas:', error)
      throw new Error('Erro ao buscar estatísticas por hierarquia')
    }

    // Agrupar por hierarquia
    const stats = data?.reduce((acc: any, commission) => {
      const role = commission.recipient_role
      if (!acc[role]) {
        acc[role] = {
          role_name: role,
          total_amount: 0,
          total_count: 0,
          avg_amount: 0
        }
      }
      acc[role].total_amount += commission.monthly_amount
      acc[role].total_count += 1
      return acc
    }, {})

    // Calcular médias e converter para array
    const result = Object.values(stats || {}).map((stat: any) => ({
      ...stat,
      avg_amount: stat.total_amount / stat.total_count
    }))

    return result
  }
}

export const commissionAPI = new CommissionAPI()