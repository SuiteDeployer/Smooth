import React, { useState } from 'react'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useRemuneracoes } from '../hooks/useRemuneracaoData'
import type { Remuneracao, RemuneracaoFilters } from '../types/remuneracao.types'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

interface RemuneracaoListProps {
  filters: RemuneracaoFilters
  onFiltersChange: (filters: RemuneracaoFilters) => void
}

const RemuneracaoList: React.FC<RemuneracaoListProps> = ({ 
  filters, 
  onFiltersChange 
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const paginatedFilters = {
    ...filters,
    page: currentPage,
    limit: itemsPerPage
  }

  const { data: remuneracoes, isLoading, error, refetch } = useRemuneracoes(paginatedFilters)

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAGO':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PENDENTE':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'ERRO':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusUpper = status.toUpperCase()
    switch (statusUpper) {
      case 'PAGO':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PENDENTE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'ERRO':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(remuneracoes?.map(item => item.id_pagamento) || [])
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id])
    } else {
      setSelectedItems(selectedItems.filter(item => item !== id))
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setSelectedItems([]) // Limpar seleção ao mudar página
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <LoadingSpinner size="lg" text="Carregando remunerações..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">Erro ao carregar dados</h3>
          </div>
          <button
            onClick={() => refetch()}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Tentar novamente
          </button>
        </div>
        <p className="text-red-600">{(error as Error).message}</p>
      </div>
    )
  }

  if (!remuneracoes || remuneracoes.length === 0) {
    return (
      <EmptyState 
        icon={Filter}
        title="Nenhuma remuneração encontrada"
        description="Nenhuma remuneração corresponde aos filtros selecionados."
        actionLabel="Limpar filtros"
        onAction={() => onFiltersChange({})}
      />
    )
  }

  const allSelected = selectedItems.length === remuneracoes.length
  const someSelected = selectedItems.length > 0 && selectedItems.length < remuneracoes.length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header da tabela */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Remunerações ({remuneracoes.length})
          </h3>
          {selectedItems.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedItems.length} item(s) selecionado(s)
            </div>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID Pagamento
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Investidor
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Debênture
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Série
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimento
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pagamento
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {remuneracoes.map((remuneracao) => (
              <tr 
                key={remuneracao.id_pagamento}
                className={`hover:bg-gray-50 ${selectedItems.includes(remuneracao.id_pagamento) ? 'bg-blue-50' : ''}`}
              >
                <td className="px-3 py-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(remuneracao.id_pagamento)}
                    onChange={(e) => handleSelectItem(remuneracao.id_pagamento, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {remuneracao.id_pagamento}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {remuneracao.nome_investidor}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                  {remuneracao.debenture}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                  {remuneracao.serie}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {formatCurrency(remuneracao.valor_remuneracao)}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(remuneracao.status)}`}>
                    {getStatusIcon(remuneracao.status)}
                    <span className="ml-1">{remuneracao.status}</span>
                  </span>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(remuneracao.data_vencimento)}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                  {remuneracao.data_pagamento ? formatDate(remuneracao.data_pagamento) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {remuneracoes.length} registros
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-700">
              Página {currentPage}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={remuneracoes.length < itemsPerPage}
              className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RemuneracaoList