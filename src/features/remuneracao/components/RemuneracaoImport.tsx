import React, { useState, useRef } from 'react'
import { 
  Upload, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Download
} from 'lucide-react'
import { useRemuneracaoImport } from '../hooks/useRemuneracaoImport'

interface RemuneracaoImportProps {
  disabled?: boolean
  onSuccess?: () => void
}

const RemuneracaoImport: React.FC<RemuneracaoImportProps> = ({ 
  disabled = false,
  onSuccess
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importMutation = useRemuneracaoImport()

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Apenas arquivos CSV são aceitos.')
      return
    }
    
    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      alert('Selecione um arquivo CSV primeiro.')
      return
    }

    try {
      await importMutation.mutateAsync(selectedFile)
      
      // Reset and close modal on success
      setSelectedFile(null)
      setIsOpen(false)
      onSuccess?.()
      
    } catch (error) {
      console.error('Erro na importação:', error)
      // Error handling is done in the hook
    }
  }

  const closeModal = () => {
    setIsOpen(false)
    setSelectedFile(null)
    setDragActive(false)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <>
      {/* Botão principal */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <Upload className="h-4 w-4 mr-2" />
        Importar CSV
      </button>

      {/* Modal de importação */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-blue-600" />
                  Importar Atualizações de Status
                </h3>
                <button
                  onClick={closeModal}
                  disabled={importMutation.isPending}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-6 py-4">
              
              {/* Instruções */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Como importar:
                </h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Primeiro, exporte o arquivo CSV atual</li>
                  <li>Edite apenas as colunas <strong>Status</strong> e <strong>Data do Pagamento</strong></li>
                  <li>Status deve ser: PAGO, PENDENTE ou ERRO</li>
                  <li>Data no formato: dd/mm/aaaa (ex: 08/01/2025)</li>
                  <li>Importe o arquivo modificado</li>
                </ol>
              </div>
              
              {/* Área de upload */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50'
                    : selectedFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Remover arquivo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileText className={`mx-auto h-8 w-8 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {dragActive ? 'Solte o arquivo aqui' : 'Arraste um arquivo CSV ou clique para selecionar'}
                      </p>
                      <p className="text-sm text-gray-500">Apenas arquivos .csv até 10MB</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Alerta de segurança */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-xs text-yellow-800">
                    <p><strong>Segurança:</strong> A importação apenas atualiza campos de status e data de pagamento dos registros existentes. Nenhum dado será excluído.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                disabled={importMutation.isPending}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile || importMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {importMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default RemuneracaoImport