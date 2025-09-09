import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { REMUNERACAO_QUERY_KEYS } from './useRemuneracaoData'
import type { RemuneracaoExportRequest } from '../types/remuneracao.types'
import toast from 'react-hot-toast'

/**
 * Hook dedicado para exportação de remunerações
 */
export const useRemuneracaoExport = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (request: RemuneracaoExportRequest = {}) => {
      console.log('🎆 Iniciando exportação de remunerações...', request)
      
      const { data, error } = await supabase.functions.invoke('remuneracoes-export', {
        body: request
      })

      if (error) {
        console.error('❌ Erro na edge function:', error)
        throw new Error(`Erro ao exportar remunerações: ${error.message}`)
      }

      console.log('✅ Dados recebidos da edge function:', !!data?.data)
      return data.data
    },
    onMutate: () => {
      console.log('💼 Iniciando processo de exportação...')
      toast.loading('Preparando exportação...', {
        id: 'export-loading'
      })
    },
    onSuccess: (data) => {
      console.log('🎉 Exportação concluída:', {
        records: data.total_records,
        amount: data.total_amount,
        filename: data.file_name
      })
      
      // Remover loading
      toast.dismiss('export-loading')
      
      // Toast de sucesso
      toast.success(`Exportação concluída!\n${data.total_records} remunerações exportadas\nTotal: R$ ${data.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
        duration: 6000
      })
      
      // Invalidar histórico se existir
      queryClient.invalidateQueries({ queryKey: REMUNERACAO_QUERY_KEYS.exportHistory })
      
      // Download automático
      try {
        const blob = new Blob([data.csv_content], { type: 'text/csv;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = data.file_name
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        console.log('📥 Download iniciado:', data.file_name)
      } catch (downloadError) {
        console.error('❌ Erro no download:', downloadError)
        toast.error('Exportação concluída, mas houve erro no download automático')
      }
    },
    onError: (error: Error) => {
      console.error('❌ Erro na exportação:', error)
      toast.dismiss('export-loading')
      toast.error(`Erro na exportação: ${error.message}`, {
        duration: 8000
      })
    }
  })
}