import { useMutation, useQueryClient } from '@tanstack/react-query'
import { REMUNERACAO_QUERY_KEYS } from './useRemuneracaoData'
import type { RemuneracaoImportResult } from '../types/remuneracao.types'
import toast from 'react-hot-toast'

/**
 * Hook dedicado para importação de remunerações
 */
export const useRemuneracaoImport = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (file: File): Promise<RemuneracaoImportResult> => {
      console.log('📤 Iniciando importação de remunerações...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })

      if (!file) {
        throw new Error('Nenhum arquivo selecionado')
      }

      if (!file.name.endsWith('.csv')) {
        throw new Error('Apenas arquivos CSV são aceitos')
      }

      // Criar FormData para envio
      const formData = new FormData()
      formData.append('file', file)

      // Fazer upload via fetch diretamente (Supabase functions não suportam FormData bem)
      const response = await fetch('https://cisoewbdzdxombthxqfi.supabase.co/functions/v1/remuneracoes-import', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NDc2NzMsImV4cCI6MjA2OTIyMzY3M30.lNvYVe8ilP-Ak0AsSv80JkLyMm_HM3rfD31EUlQF-fQ',
        },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.error?.message || 'Erro na importação'
        console.error('❌ Erro na importação:', result)
        throw new Error(errorMessage)
      }

      console.log('✅ Importação processada:', result.data)
      return result.data
    },
    onMutate: (file) => {
      console.log('🔄 Iniciando processo de importação...', file.name)
      toast.loading(`Importando ${file.name}...`, {
        id: 'import-loading'
      })
    },
    onSuccess: (data) => {
      const { totalProcessed, successCount, errorCount, errors } = data
      
      console.log('🎉 Importação concluída:', {
        totalProcessed,
        successCount,
        errorCount,
        hasErrors: errors && errors.length > 0
      })
      
      // Remover loading
      toast.dismiss('import-loading')
      
      // Mensagens baseadas no resultado
      if (errorCount === 0) {
        toast.success(`Importação concluída com sucesso!\n${successCount} registros atualizados`, {
          duration: 6000
        })
      } else if (successCount > 0) {
        toast.success(`Importação parcial: ${successCount} sucessos, ${errorCount} erros`, {
          duration: 6000
        })
        
        // Mostrar primeiros erros
        if (errors && errors.length > 0) {
          toast.error(`Erros encontrados:\n${errors.slice(0, 3).join('\n')}`, {
            duration: 10000
          })
        }
      } else {
        toast.error(`Importação falhou: ${errorCount} erros, nenhum sucesso`, {
          duration: 8000
        })
        
        if (errors && errors.length > 0) {
          toast.error(`Erros:\n${errors.slice(0, 2).join('\n')}`, {
            duration: 10000
          })
        }
      }
      
      // Invalidar cache para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['remuneracao'] })
    },
    onError: (error: Error) => {
      console.error('❌ Erro na importação:', error)
      toast.dismiss('import-loading')
      toast.error(`Falha na importação: ${error.message}`, {
        duration: 8000
      })
    }
  })
}