import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import type { 
  Remuneracao, 
  RemuneracaoFilters, 
  RemuneracaoExportRequest,
  RemuneracaoImportRequest,
  RemuneracaoImportResult 
} from '../types/remuneracao.types'
import toast from 'react-hot-toast'

// Chaves de query para cache
export const REMUNERACAO_QUERY_KEYS = {
  summary: ['remuneracao', 'summary'],
  list: (filters: RemuneracaoFilters) => ['remuneracao', 'list', filters],
  exportHistory: ['remuneracao', 'exportHistory'],
  all: ['remuneracao']
}

/**
 * Hook para sincronizar remunerações com investimentos
 */
export const useSyncRemuneracoes = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('remuneracoes-sync', {
        body: {}
      })

      if (error) {
        throw new Error(`Erro ao sincronizar remunerações: ${error.message}`)
      }

      return data.data
    },
    onSuccess: (data) => {
      toast.success(`Sincronização concluída! ${data.recordsCreated} novas remunerações criadas.`, {
        duration: 4000
      })
      
      // Invalidar todos os dados de remunerações
      queryClient.invalidateQueries({ queryKey: REMUNERACAO_QUERY_KEYS.all })
    },
    onError: (error: Error) => {
      toast.error(`Erro na sincronização: ${error.message}`, {
        duration: 6000
      })
    }
  })
}

/**
 * Hook para buscar lista de remunerações com filtros
 */
export const useRemuneracoes = (filters: RemuneracaoFilters = {}) => {
  return useQuery({
    queryKey: REMUNERACAO_QUERY_KEYS.list(filters),
    queryFn: async () => {
      // Primeiro sincronizar remunerações (silenciosamente)
      try {
        await supabase.functions.invoke('remuneracoes-sync', {
          body: {}
        })
      } catch (error) {
        console.warn('Sync silencioso falhou:', error)
        // Não interromper a busca se sync falhar
      }

      let query = supabase
        .from('remuneracoes')
        .select('*')
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters.investidor && filters.investidor.length > 0) {
        query = query.in('nome_investidor', filters.investidor)
      }

      if (filters.serie && filters.serie.length > 0) {
        query = query.in('serie', filters.serie)
      }

      if (filters.debenture && filters.debenture.length > 0) {
        query = query.in('debenture', filters.debenture)
      }

      if (filters.minAmount) {
        query = query.gte('valor_remuneracao', filters.minAmount)
      }

      if (filters.maxAmount) {
        query = query.lte('valor_remuneracao', filters.maxAmount)
      }

      if (filters.dateFrom) {
        query = query.gte('data_vencimento', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('data_vencimento', filters.dateTo)
      }

      // Paginação
      const page = filters.page || 1
      const limit = filters.limit || 50
      const offset = (page - 1) * limit

      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar remunerações:', error)
        throw new Error('Erro ao buscar remunerações')
      }

      return data || []
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
    retry: 2,
    refetchOnWindowFocus: false
  })
}

/**
 * Hook para buscar resumo das remunerações
 */
export const useRemuneracaoSummary = () => {
  return useQuery({
    queryKey: REMUNERACAO_QUERY_KEYS.summary,
    queryFn: async () => {
      // Primeiro sincronizar remunerações (silenciosamente)
      try {
        await supabase.functions.invoke('remuneracoes-sync', {
          body: {}
        })
      } catch (error) {
        console.warn('Sync silencioso falhou:', error)
        // Não interromper a busca se sync falhar
      }

      const { data, error } = await supabase
        .from('remuneracoes')
        .select('valor_remuneracao, status')

      if (error) {
        console.error('Erro ao buscar resumo:', error)
        throw new Error('Erro ao buscar resumo das remunerações')
      }

      // Calcular estatísticas
      const summary = data?.reduce((acc, item) => {
        acc.count_total++
        acc.total_remuneracao += item.valor_remuneracao
        
        switch (item.status) {
          case 'PAGO':
            acc.count_pago++
            acc.total_pago += item.valor_remuneracao
            break
          case 'PENDENTE':
            acc.count_pendente++
            acc.total_pendente += item.valor_remuneracao
            break
          case 'ERRO':
            acc.count_erro++
            acc.total_erro += item.valor_remuneracao
            break
        }
        
        return acc
      }, {
        total_remuneracao: 0,
        total_pago: 0,
        total_pendente: 0,
        total_erro: 0,
        count_pago: 0,
        count_pendente: 0,
        count_erro: 0,
        count_total: 0
      })

      return summary
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    refetchOnWindowFocus: false
  })
}

/**
 * Hook para exportar remunerações
 */
export const useExportRemuneracoes = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (request: RemuneracaoExportRequest = {}) => {
      const { data, error } = await supabase.functions.invoke('remuneracoes-export', {
        body: request
      })

      if (error) {
        throw new Error(`Erro ao exportar remunerações: ${error.message}`)
      }

      return data.data
    },
    onSuccess: (data) => {
      toast.success(`Exportação concluída! ${data.total_records} remunerações exportadas.`, {
        duration: 6000
      })
      
      // Invalidar histórico de exportações se existir
      queryClient.invalidateQueries({ queryKey: REMUNERACAO_QUERY_KEYS.exportHistory })
      
      // Fazer download do arquivo
      const blob = new Blob([data.csv_content], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = data.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onError: (error: Error) => {
      toast.error(`Erro na exportação: ${error.message}`, {
        duration: 8000
      })
    }
  })
}

/**
 * Hook para importar remunerações
 */
export const useImportRemuneracoes = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (file: File): Promise<RemuneracaoImportResult> => {
      if (!file) {
        throw new Error('Nenhum arquivo selecionado')
      }

      if (!file.name.endsWith('.csv')) {
        throw new Error('Apenas arquivos CSV são aceitos')
      }

      const formData = new FormData()
      formData.append('file', file)

      const { data, error } = await supabase.functions.invoke('remuneracoes-import', {
        body: formData
      })

      if (error) {
        throw new Error(`Erro ao importar remunerações: ${error.message}`)
      }

      return data.data
    },
    onSuccess: (data) => {
      const { successCount, errorCount, errors } = data
      
      if (errorCount === 0) {
        toast.success(`Importação concluída! ${successCount} registros processados com sucesso.`, {
          duration: 6000
        })
      } else {
        toast.success(`Importação concluída com alertas: ${successCount} sucessos, ${errorCount} erros.`, {
          duration: 6000
        })
        
        if (errors && errors.length > 0) {
          toast.error(`Primeiros erros: ${errors.slice(0, 3).join('; ')}`, {
            duration: 10000
          })
        }
      }
      
      // Invalidar dados de remunerações
      queryClient.invalidateQueries({ queryKey: REMUNERACAO_QUERY_KEYS.all })
    },
    onError: (error: Error) => {
      toast.error(`Erro na importação: ${error.message}`, {
        duration: 8000
      })
    }
  })
}