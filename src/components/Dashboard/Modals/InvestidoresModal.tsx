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
import { User, TrendingUp, Calendar, UserPlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface InvestidoresModalProps {
  isOpen: boolean
  onClose: () => void
  data: DashboardMetrics['investidores'] | null
}

const InvestidoresModal: React.FC<InvestidoresModalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] bg-white border border-gray-200">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <User className="h-5 w-5 text-emerald-600" />
            Investidores na Rede
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Detalhes dos investidores em sua hierarquia
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] p-6 space-y-6">
          {/* Estatísticas Resumidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">Total</span>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{data.total}</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Novos este mês</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{data.new_this_month}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Taxa de crescimento</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {data.total > 0 ? ((data.new_this_month / data.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Investidores Recentes */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">Novos Investidores (Este Mês)</h3>
                </div>
                
                {data.recent.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {data.recent.map((investor) => (
                      <div key={investor.id} className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-green-100">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{investor.name}</h4>
                          <p className="text-sm text-gray-600">{investor.email}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={investor.status === 'ATIVO' ? 'default' : 'secondary'}
                          >
                            {investor.status}
                          </Badge>
                          
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Criado há</p>
                            <p className="text-sm font-medium text-gray-700">
                              {formatDistanceToNow(new Date(investor.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <UserPlus className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500 mt-2">Nenhum novo investidor este mês</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Todos os Investidores */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-800">Todos os Investidores</h3>
                </div>
                
                {data.all.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {data.all.map((investor) => (
                      <div key={investor.id} className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-blue-100">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{investor.name}</h4>
                          <p className="text-sm text-gray-600">{investor.email}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={investor.status === 'ATIVO' ? 'default' : 'secondary'}
                          >
                            {investor.status}
                          </Badge>
                          
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Criado há</p>
                            <p className="text-sm font-medium text-gray-700">
                              {formatDistanceToNow(new Date(investor.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <User className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500 mt-2">Nenhum investidor encontrado</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InvestidoresModal