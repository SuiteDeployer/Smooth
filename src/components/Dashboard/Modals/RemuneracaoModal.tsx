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
import { Receipt, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface RemuneracaoModalProps {
  isOpen: boolean
  onClose: () => void
  data: DashboardMetrics['remuneracao'] | null
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const RemuneracaoModal: React.FC<RemuneracaoModalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null

  const totalProcessadas = data.pagas.count + data.erro.count
  const percentualSucesso = totalProcessadas > 0 ? (data.pagas.count / totalProcessadas) * 100 : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] bg-white border border-gray-200">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Receipt className="h-5 w-5 text-teal-600" />
            Remuneração da Rede
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Detalhes das remunerações do mês atual na sua hierarquia
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] p-6 space-y-6">
          {/* Estatísticas Resumidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium text-teal-800">Total do Mês</span>
              </div>
              <p className="text-xl font-bold text-teal-900">{formatCurrency(data.total_this_month)}</p>
              <p className="text-xs text-teal-700">{data.count_this_month} pagamentos</p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Pendentes</span>
              </div>
              <p className="text-xl font-bold text-yellow-900">{formatCurrency(data.pendentes.amount)}</p>
              <p className="text-xs text-yellow-700">{data.pendentes.count} pagamentos</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Pagas</span>
              </div>
              <p className="text-xl font-bold text-green-900">{formatCurrency(data.pagas.amount)}</p>
              <p className="text-xs text-green-700">{data.pagas.count} pagamentos</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Com Erro</span>
              </div>
              <p className="text-xl font-bold text-red-900">{formatCurrency(data.erro.amount)}</p>
              <p className="text-xs text-red-700">{data.erro.count} pagamentos</p>
            </div>
          </div>

          {/* Indicadores de Performance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Taxa de Sucesso</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{percentualSucesso.toFixed(1)}%</p>
              <p className="text-xs text-blue-700">dos pagamentos processados</p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Valor Médio</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {data.count_this_month > 0 ? formatCurrency(data.total_this_month / data.count_this_month) : 'R$ 0,00'}
              </p>
              <p className="text-xs text-purple-700">por pagamento</p>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">% Pendente</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {data.count_this_month > 0 ? ((data.pendentes.count / data.count_this_month) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-orange-700">aguardando processamento</p>
            </div>
          </div>

          {/* Status da Remuneração */}
          <Card className="bg-gradient-to-br from-gray-50 to-slate-100 border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Status dos Pagamentos</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pendentes */}
                <div className="bg-white p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <span className="font-medium text-gray-700">Pendentes</span>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {data.pendentes.count}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-yellow-700">{formatCurrency(data.pendentes.amount)}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full" 
                      style={{ width: `${data.count_this_month > 0 ? (data.pendentes.count / data.count_this_month) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Pagas */}
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="font-medium text-gray-700">Pagas</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {data.pagas.count}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(data.pagas.amount)}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-400 h-2 rounded-full" 
                      style={{ width: `${data.count_this_month > 0 ? (data.pagas.count / data.count_this_month) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Com Erro */}
                <div className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <span className="font-medium text-gray-700">Com Erro</span>
                    </div>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {data.erro.count}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-red-700">{formatCurrency(data.erro.amount)}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-red-400 h-2 rounded-full" 
                      style={{ width: `${data.count_this_month > 0 ? (data.erro.count / data.count_this_month) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Breakdown por Investidor */}
          {data.breakdown.length > 0 && (
            <Card className="bg-white border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Breakdown por Investidor</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {data.breakdown
                    .sort((a, b) => b.total_amount - a.total_amount)
                    .map((investor, index) => (
                    <div key={investor.investor_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index < 3 ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{investor.investor_name}</h4>
                          <p className="text-xs text-gray-600">{investor.count} pagamentos</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-teal-700">{formatCurrency(investor.total_amount)}</p>
                        <p className="text-xs text-gray-600">
                          {((investor.total_amount / data.total_this_month) * 100).toFixed(1)}% do total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RemuneracaoModal