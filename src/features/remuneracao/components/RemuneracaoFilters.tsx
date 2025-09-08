import React, { useState, useEffect } from 'react'
import { 
  Filter,
  X,
  Search,
  Calendar,
  DollarSign
} from 'lucide-react'
import type { RemuneracaoFilters } from '../types/remuneracao.types'

interface RemuneracaoFiltersProps {
  filters: RemuneracaoFilters
  onFiltersChange: (filters: RemuneracaoFilters) => void
  onClearFilters: () => void
}

const RemuneracaoFilters: React.FC<RemuneracaoFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<RemuneracaoFilters>(filters)

  // Sincronizar filtros locais com os externos
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof RemuneracaoFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleArrayFilterChange = (key: keyof RemuneracaoFilters, value: string) => {
    const currentArray = (localFilters[key] as string[]) || []
    let newArray: string[]
    
    if (currentArray.includes(value)) {
      newArray = currentArray.filter(item => item !== value)
    } else {
      newArray = [...currentArray, value]
    }
    
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined)
  }

  const clearAllFilters = () => {
    setLocalFilters({})
    onClearFilters()
    setIsOpen(false)
  }

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof RemuneracaoFilters]
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : true)
  })

  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof RemuneracaoFilters]
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : true)
  }).length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header do filtro */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                hasActiveFilters 
                  ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </button>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {hasActiveFilters ? 'Filtros aplicados' : 'Nenhum filtro aplicado'}
          </div>
        </div>
      </div>

      {/* Panel de filtros */}
      {isOpen && (
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Filtro por Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="space-y-2">
                {['PENDENTE', 'PAGO', 'ERRO'].map(status => (
                  <label key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(localFilters.status || []).includes(status)}
                      onChange={() => handleArrayFilterChange('status', status)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Faixa de Valor
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Valor mínimo"
                  value={localFilters.minAmount || ''}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <input
                  type="number"
                  placeholder="Valor máximo"
                  value={localFilters.maxAmount || ''}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Filtro por Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Datas de Vencimento
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={localFilters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <input
                  type="date"
                  value={localFilters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Busca por Texto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="inline h-4 w-4 mr-1" />
                Busca Rápida
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nome do investidor..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <option value="">Todas as séries</option>
                  <option value="Serie A">Série A</option>
                  <option value="Serie B">Série B</option>
                  <option value="Serie C">Série C</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicadores de filtros ativos */}
      {hasActiveFilters && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-blue-700 font-medium">Filtros ativos:</span>
            
            {filters.status && filters.status.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Status: {filters.status.join(', ')}
              </span>
            )}
            
            {filters.minAmount && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Min: R$ {filters.minAmount.toLocaleString('pt-BR')}
              </span>
            )}
            
            {filters.maxAmount && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Max: R$ {filters.maxAmount.toLocaleString('pt-BR')}
              </span>
            )}
            
            {(filters.dateFrom || filters.dateTo) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Data: {filters.dateFrom || '...'} a {filters.dateTo || '...'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RemuneracaoFilters