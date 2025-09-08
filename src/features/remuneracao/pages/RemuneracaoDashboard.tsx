import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useRemuneracaoSummary, useSyncRemuneracoes } from '../hooks/useRemuneracaoData'
import RemuneracaoList from '../components/RemuneracaoList'
import RemuneracaoFilters from '../components/RemuneracaoFilters'
import RemuneracaoExport from '../components/RemuneracaoExport'
import RemuneracaoImport from '../components/RemuneracaoImport'
import LoadingSpinner from '../components/LoadingSpinner'
import type { RemuneracaoFilters as FilterType } from '../types/remuneracao.types'

interface MetricCard {
  title: string
  value: string
  change?: string
  icon: React.ElementType
  color: string
  trend?: 'up' | 'down' | 'stable'
}

const RemuneracaoDashboard: React.FC = () => {
  console.log('🎆 REMUNERACAO DASHBOARD CARREGADO!')
  
  const [filters, setFilters] = useState<FilterType>({})
  const { user } = useAuth()
  
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useRemuneracaoSummary()
  const syncRemuneracoes = useSyncRemuneracoes()

  // Função para sincronizar com investimentos
  const handleSync = () => {
    console.log('🔄 Sincronizando remunerações com investimentos...')
    syncRemuneracoes.mutate()
  }

  // Função para limpar filtros
  const handleClearFilters = () => {
    setFilters({})
  }

  // Função chamada após importação bem-sucedida
  const handleImportSuccess = () => {
    handleSync()
  }

  // Preparar cards de métricas
  const metricsCards: MetricCard[] = [
    {
      title: 'Total de Remunerações',
      value: summary ? `R$ ${summary.total_remuneracao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
      change: `${summary?.count_total || 0} registros`,
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      trend: 'stable'
    },
    {
      title: 'Pagamentos Pendentes',
      value: summary ? `R$ ${summary.total_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
      change: `${summary?.count_pendente || 0} pendentes`,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      trend: 'stable'
    },
    {
      title: 'Pagamentos Realizados',
      value: summary ? `R$ ${summary.total_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
      change: `${summary?.count_pago || 0} pagos`,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      trend: 'up'
    },
    {
      title: 'Pagamentos com Erro',
      value: summary ? `R$ ${summary.total_erro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
      change: `${summary?.count_erro || 0} com erro`,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      trend: 'stable'
    }
  ]

  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando dashboard de remuneração..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Dashboard de Remuneração
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Controle e monitoramento dos pagamentos de remuneração aos investidores
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Botão Sincronizar com Investimentos */}
                <button 
                  onClick={handleSync}
                  disabled={syncRemuneracoes.isPending}
                  className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrendingUp className={`h-4 w-4 mr-2 ${syncRemuneracoes.isPending ? 'animate-spin' : ''}`} />
                  {syncRemuneracoes.isPending ? 'Sincronizando...' : 'Sincronizar'}
                </button>
                
                {/* Botão de Exportação */}
                <RemuneracaoExport />
                
                {/* Botão de Importação */}
                <RemuneracaoImport onSuccess={handleImportSuccess} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricsCards.map((metric, index) => {
            const IconComponent = metric.icon
            return (
              <div 
                key={index} 
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
                    <p className="text-xs text-gray-500">{metric.change}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${metric.color} flex-shrink-0`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Error state for summary */}
        {summaryError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Erro ao carregar resumo</h3>
                <p className="text-sm text-red-600 mt-1">{(summaryError as Error).message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6">
          <RemuneracaoFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Lista de Remunerações */}
        <div className="mb-8">
          <RemuneracaoList
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        
        {/* Informações adicionais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Instruções rápidas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Fluxo de Trabalho
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</div>
                <div>
                  <p className="font-medium text-gray-900">Exportar dados</p>
                  <p>Baixe o arquivo CSV com as remunerações atuais</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</div>
                <div>
                  <p className="font-medium text-gray-900">Atualizar status</p>
                  <p>Edite apenas as colunas Status e Data do Pagamento</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</div>
                <div>
                  <p className="font-medium text-gray-900">Importar atualizações</p>
                  <p>Faça o upload do arquivo CSV modificado</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Status de permissões */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Informações do Sistema
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Usuário:</span>
                <span className="font-medium text-gray-900">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Controle de Acesso:</span>
                <span className="text-green-600 font-medium">RLS Ativo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Filtros aplicados:</span>
                <span className="font-medium text-gray-900">
                  {Object.keys(filters).length > 0 ? Object.keys(filters).length : 'Nenhum'}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  • Apenas registros autorizados são exibidos<br/>
                  • Atualizações são auditadas automaticamente
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RemuneracaoDashboard