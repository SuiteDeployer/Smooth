import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Badge } from '../../ui/badge'
import { Card } from '../../ui/card'
import { DashboardMetrics } from '../../../types/dashboard.types'
import { TrendingUp, DollarSign, Calendar, PieChart, BarChart3 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface InvestmentsModalProps {
  isOpen: boolean
  onClose: () => void
  data: DashboardMetrics['investments'] | null
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const InvestmentsModal: React.FC<InvestmentsModalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[90vw] max-h-[85vh] bg-white border border-gray-200">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Investimentos na Rede
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Detalhes dos investimentos realizados na sua hierarquia
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] p-6 space-y-6">
          {/* Estatísticas Resumidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Total</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{data.total}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Novos este mês</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{data.new_this_month}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Valor Total</span>
              </div>
              <p className="text-xl font-bold text-purple-900">{formatCurrency(data.total_amount)}</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Novo este mês</span>
              </div>
              <p className="text-xl font-bold text-orange-900">{formatCurrency(data.new_amount_this_month)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Investimentos Recentes */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-800">Investimentos Recentes</h3>
                </div>
                
                {data.recent.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {data.recent.map((investment) => (
                      <div key={investment.id} className="p-4 bg-white/70 rounded-lg border border-blue-100">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{investment.investor_name}</h4>
                            <p className="text-sm text-gray-600">Assessor: {investment.assessor_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-700">{formatCurrency(investment.amount)}</p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(investment.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {investment.series_name}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <TrendingUp className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500 mt-2">Nenhum investimento recente</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Breakdown por Série */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">Breakdown por Série</h3>
                </div>
                
                {data.breakdown_by_series.length > 0 ? (
                  <div className="space-y-3">
                    {data.breakdown_by_series
                      .sort((a, b) => b.total_amount - a.total_amount)
                      .map((series, index) => (
                      <div key={series.series_code} className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-green-100">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                            index < 3 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{series.series_code || 'Sem série'}</h4>
                            <p className="text-xs text-gray-600">{series.count} investimentos</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-green-700">{formatCurrency(series.total_amount)}</p>
                          <p className="text-xs text-gray-600">
                            {((series.total_amount / data.total_amount) * 100).toFixed(1)}% do total
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <PieChart className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500 mt-2">Nenhuma série encontrada</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Resumo Estatístico */}
          <Card className="bg-gradient-to-r from-gray-50 to-slate-100 border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo Estatístico</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Ticket Médio</p>
                  <p className="text-xl font-bold text-gray-900">
                    {data.total > 0 ? formatCurrency(data.total_amount / data.total) : 'R$ 0,00'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Crescimento Mensal</p>
                  <p className="text-xl font-bold text-green-600">
                    {data.total > 0 ? ((data.new_this_month / data.total) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Séries Ativas</p>
                  <p className="text-xl font-bold text-blue-600">{data.breakdown_by_series.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Valor Médio/Série</p>
                  <p className="text-xl font-bold text-purple-600">
                    {data.breakdown_by_series.length > 0 
                      ? formatCurrency(data.total_amount / data.breakdown_by_series.length)
                      : 'R$ 0,00'
                    }
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InvestmentsModal