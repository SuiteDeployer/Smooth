// Tipos para o sistema de comissões

export interface CommissionPayment {
  payment_id: string
  recipient_name: string
  recipient_role: string
  series_code: string
  amount: number
  pix_key_type?: string
  pix_key?: string
  status: 'PAGO' | 'PENDENTE' | 'CANCELADO' | 'VENCIDA'
  payment_month: string
  due_date: string
  payment_date?: string
  commission_schedule_id: string
  investment_id: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CommissionSummary {
  total_commission: number
  total_paid: number
  total_pending: number
  total_overdue: number
  count_paid: number
  count_pending: number
  count_overdue: number
  count_total: number
}

export interface CommissionMonthlySummary {
  payment_month: string
  total_amount: number
  paid_amount: number
  pending_amount: number
  overdue_amount: number
  count_total: number
  count_paid: number
  count_pending: number
  count_overdue: number
}

export interface CommissionExport {
  id: string
  export_month: string
  total_records: number
  total_amount: number
  file_name: string
  created_at: string
  exported_by: string
}

export interface CommissionProfile {
  id: string
  series_id: string
  role_name: string
  commission_percentage: number
  created_at: string
  updated_at: string
  series: {
    name: string
    series_code: string
  }
}

export interface CommissionFilters {
  month?: number
  year?: number
  status?: string[]
  role?: string[]
  series?: string[]
  minAmount?: number
  maxAmount?: number
  dateFrom?: string
  dateTo?: string
}

export interface ExportRequest {
  month: number
  year: number
}

export interface ImportRequest {
  csv_data: string
  export_batch_id: string
}

export interface ReportRequest {
  report_type: 'period' | 'hierarchy' | 'series'
  filters: CommissionFilters
  format?: 'json' | 'csv' | 'excel'
}