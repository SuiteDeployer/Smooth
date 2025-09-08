import React, { useState } from 'react'
import { useInvestorInvestments, Investment } from '../../hooks/useInvestorInvestments'
import { FileText, Calendar, DollarSign, TrendingUp, Search, Eye, X } from 'lucide-react'
import { formatCurrency, formatDate } from '../../lib/utils'

const InvestorInvestments = () => {
  const { investments, stats, isLoading, error, refetch } = useInvestorInvestments()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando seus investimentos...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-medium mb-2">Erro ao carregar investimentos</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={refetch}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // Filtrar investimentos
  const filteredInvestments = investments.filter((investment) => {
    const matchesSearch = 
      investment.series?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investment.series?.series_code?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || investment.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Calcular valor no vencimento
  const calculateMaturityValue = (investment: Investment) => {
    const principal = investment.invested_amount
    const rate = investment.interest_rate / 100
    const startDate = new Date(investment.investment_date)
    const endDate = new Date(investment.maturity_date)
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                   endDate.getMonth() - startDate.getMonth()
    
    if (investment.interest_type === 'compound') {
      return principal * Math.pow(1 + rate / 12, months)
    } else {
      return principal * (1 + (rate * months / 12))
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meus Investimentos</h1>
        <p className="text-gray-600 mt-2">Visualize todos os seus investimentos em debêntures</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total de Investimentos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_investments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Investido</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_invested)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Taxa Média</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avg_interest_rate.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Investimentos Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active_investments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por série ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Investimentos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Lista de Investimentos</h2>
          <p className="text-sm text-gray-600 mt-1">{filteredInvestments.length} investimento(s) encontrado(s)</p>
        </div>
        
        <div className="p-6">
          {filteredInvestments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>Nenhum investimento encontrado</p>
              <p className="text-sm">
                {investments.length === 0 
                  ? 'Você ainda não possui investimentos' 
                  : 'Ajuste os filtros para encontrar investimentos'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvestments.map((investment) => {
                const maturityValue = calculateMaturityValue(investment)
                const gain = maturityValue - investment.invested_amount
                const gainPercentage = ((gain / investment.invested_amount) * 100)
                
                return (
                  <div
                    key={investment.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {investment.series?.series_code} - {investment.series?.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Investido em {formatDate(investment.investment_date)}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              investment.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {investment.status === 'active' ? 'Ativo' : 'Cancelado'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Valor Investido</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(investment.invested_amount)}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-600">Taxa de Juros</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {investment.interest_rate}% a.a.
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-600">Vencimento</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatDate(investment.maturity_date)}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-600">Valor no Vencimento</p>
                            <p className="text-lg font-semibold text-green-600">
                              {formatCurrency(maturityValue)}
                            </p>
                            <p className="text-xs text-green-600">
                              +{formatCurrency(gain)} ({gainPercentage.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="lg:ml-6 mt-4 lg:mt-0">
                        <button
                          onClick={() => setSelectedInvestment(investment)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedInvestment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalhes do Investimento
                </h2>
                <button
                  onClick={() => setSelectedInvestment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Informações Básicas</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Série:</span>
                      <p className="font-medium">{selectedInvestment.series?.series_code} - {selectedInvestment.series?.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedInvestment.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedInvestment.status === 'active' ? 'Ativo' : 'Cancelado'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Valores</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Valor Investido:</span>
                      <p className="font-medium">{formatCurrency(selectedInvestment.invested_amount)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Taxa de Juros:</span>
                      <p className="font-medium">{selectedInvestment.interest_rate}% a.a. ({selectedInvestment.interest_type})</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Valor no Vencimento:</span>
                      <p className="font-medium text-green-600">{formatCurrency(calculateMaturityValue(selectedInvestment))}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Datas</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Data do Investimento:</span>
                      <p className="font-medium">{formatDate(selectedInvestment.investment_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Data de Vencimento:</span>
                      <p className="font-medium">{formatDate(selectedInvestment.maturity_date)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvestorInvestments
