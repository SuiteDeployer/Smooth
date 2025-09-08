import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commissionAPI } from '../services/commissionAPI'
import type { CommissionFilters, ExportRequest, ImportRequest } from '../types/commission.types'
import toast from 'react-hot-toast'

// Chaves de query para cache
export const COMMISSION_QUERY_KEYS = {
  summary: ['commissions', 'summary'],
  monthlySummary: ['commissions', 'monthlySummary'],
  overdue: ['commissions', 'overdue'],
  list: (filters: CommissionFilters & { page?: number; limit?: number }) => ['commissions', 'list', filters],
  exportHistory: ['commissions', 'exportHistory'],
  profiles: ['commissions', 'profiles'],
  hierarchyStats: ['commissions', 'hierarchyStats']
}

/**
 * Hook para buscar resumo geral
 */
export const useCommissionSummary = () => {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.summary,
    queryFn: () => commissionAPI.getSummary(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    refetchOnWindowFocus: false
  })
}

/**
 * Hook para buscar resumo mensal
 */
export const useCommissionMonthlySummary = () => {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.monthlySummary,
    queryFn: () => commissionAPI.getMonthlySummary(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
    refetchOnWindowFocus: false
  })
}

/**
 * Hook para buscar comissões vencidas
 */
export const useOverdueCommissions = () => {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.overdue,
    queryFn: () => commissionAPI.getOverdueCommissions(),
    staleTime: 2 * 60 * 1000, // 2 minutos (mais frequente por ser crítico)
    retry: 2,
    refetchOnWindowFocus: true
  })
}

/**
 * Hook para buscar lista de comissões com filtros
 */
export const useCommissions = (filters: CommissionFilters & { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.list(filters),
    queryFn: () => commissionAPI.getCommissions(filters),
    staleTime: 3 * 60 * 1000, // 3 minutos
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: !!(filters.month && filters.year) || Object.keys(filters).length > 2 // Evitar query sem filtros
  })
}

/**
 * Hook para buscar histórico de exportações
 */
export const useExportHistory = () => {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.exportHistory,
    queryFn: () => commissionAPI.getExportHistory(),
    staleTime: 5 * 60 * 1000,
    retry: 2
  })
}

/**
 * Hook para buscar perfis de comissão
 */
export const useCommissionProfiles = () => {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.profiles,
    queryFn: () => commissionAPI.getCommissionProfiles(),
    staleTime: 15 * 60 * 1000, // 15 minutos (dados menos voláteis)
    retry: 2,
    refetchOnWindowFocus: false
  })
}

/**
 * Hook para buscar estatísticas por hierarquia
 */
export const useHierarchyStats = () => {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.hierarchyStats,
    queryFn: () => commissionAPI.getHierarchyStats(),
    staleTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false
  })
}

/**
 * Hook para exportar comissões
 */
export const useExportCommissions = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (request: ExportRequest) => commissionAPI.exportCommissions(request),
    onSuccess: (data) => {
      toast.success(`Exportação concluída! ${data.total_records} comissões exportadas.`, {
        duration: 6000
      })
      
      // Invalidar histórico de exportações
      queryClient.invalidateQueries({ queryKey: COMMISSION_QUERY_KEYS.exportHistory })
      
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
 * Hook para importar comissões
 */
export const useImportCommissions = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (request: ImportRequest) => commissionAPI.importCommissions(request),
    onSuccess: (data) => {
      toast.success(`Importação concluída! ${data.processed} registros processados.`, {
        duration: 6000
      })
      
      if (data.errors > 0) {
        toast.error(`${data.errors} registros com erro. Verifique o arquivo.`, {
          duration: 8000
        })
      }
      
      // Invalidar dados de comissões
      queryClient.invalidateQueries({ queryKey: ['commissions'] })
    },
    onError: (error: Error) => {
      toast.error(`Erro na importação: ${error.message}`, {
        duration: 8000
      })
    }
  })
}

/**
 * Hook para atualizar perfil de comissão
 */
export const useUpdateCommissionProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ profileId, percentage }: { profileId: string; percentage: number }) => 
      commissionAPI.updateCommissionProfile(profileId, percentage),
    onSuccess: () => {
      toast.success('Perfil de comissão atualizado com sucesso!', {
        duration: 4000
      })
      
      // Invalidar perfis
      queryClient.invalidateQueries({ queryKey: COMMISSION_QUERY_KEYS.profiles })
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`, {
        duration: 6000
      })
    }
  })
}