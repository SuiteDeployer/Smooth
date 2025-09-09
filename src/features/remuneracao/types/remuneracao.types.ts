// Tipos para o sistema de remuneração

export interface Remuneracao {
  id_pagamento: string
  nome_investidor: string
  debenture: string
  serie: string
  valor_remuneracao: number
  status: 'PENDENTE' | 'PAGO' | 'ERRO'
  data_vencimento: string
  data_pagamento?: string
  pix: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface RemuneracaoSummary {
  total_remuneracao: number
  total_pago: number
  total_pendente: number
  total_erro: number
  count_pago: number
  count_pendente: number
  count_erro: number
  count_total: number
}

export interface RemuneracaoMonthlySummary {
  mes: string
  total_valor: number
  valor_pago: number
  valor_pendente: number
  valor_erro: number
  count_total: number
  count_pago: number
  count_pendente: number
  count_erro: number
}

export interface RemuneracaoExport {
  id: string
  export_date: string
  total_records: number
  total_amount: number
  file_name: string
  created_at: string
  exported_by: string
}

export interface RemuneracaoFilters {
  status?: string[]
  investidor?: string[]
  serie?: string[]
  debenture?: string[]
  minAmount?: number
  maxAmount?: number
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface RemuneracaoExportRequest {
  filters?: RemuneracaoFilters
  format?: 'csv' | 'excel'
}

export interface RemuneracaoImportRequest {
  csv_data: string
  validate_only?: boolean
}

export interface RemuneracaoImportResult {
  totalProcessed: number
  successCount: number
  errorCount: number
  errors: string[]
}