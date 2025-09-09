import React, { useState } from 'react'
import { Download, FileText, AlertCircle } from 'lucide-react'
import { useRemuneracaoExport } from '../hooks/useRemuneracaoExport'
import type { RemuneracaoExportRequest } from '../types/remuneracao.types'

interface RemuneracaoExportProps {
  disabled?: boolean
  className?: string
}

const RemuneracaoExport: React.FC<RemuneracaoExportProps> = ({ 
  disabled = false,
  className = ''
}) => {
  const [showOptions, setShowOptions] = useState(false)
  const exportMutation = useRemuneracaoExport()

  const handleExport = async (options?: RemuneracaoExportRequest) => {
    console.log('📥 Iniciando exportação com opções:', options)
    
    try {
      await exportMutation.mutateAsync(options || {})
      setShowOptions(false) // Fechar modal após sucesso
    } catch (error) {
      console.error('❌ Erro na exportação:', error)
      // O erro já é tratado no hook
    }
  }

  const handleQuickExport = () => {
    handleExport({})
  }

  if (showOptions) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Download className="h-5 w-5 mr-2 text-blue-600" />
                Opções de Exportação
              </h3>
              <button
                onClick={() => setShowOptions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="px-6 py-4">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">CSV Completo</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Exporta todas as remunerações visíveis com os filtros aplicados
                    </p>
                    <ul className="text-xs text-blue-600 space-y-1">
                      <li>• ID Pagamento, Investidor, Debênture</li>
                      <li>• Série, Valor, Status, Datas</li>
                      <li>• Chave PIX para atualizações</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                  <div>
                    <p className="text-xs text-yellow-800">
                      <strong>Importante:</strong> O arquivo exportado pode ser usado para importar atualizações de status.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowOptions(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleExport({ format: 'csv' })}
              disabled={exportMutation.isPending}
              className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {exportMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`inline-flex ${className}`}>
      {/* Botão de exportação rápida */}
      <button
        onClick={handleQuickExport}
        disabled={disabled || exportMutation.isPending}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-l-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Exportação rápida"
      >
        {exportMutation.isPending ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full mr-2" />
            Exportando...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </>
        )}
      </button>
      
      {/* Botão de opções */}
      <button
        onClick={() => setShowOptions(true)}
        disabled={disabled || exportMutation.isPending}
        className="inline-flex items-center px-2 py-2 border border-l-0 border-gray-300 rounded-r-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Opções de exportação"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

export default RemuneracaoExport