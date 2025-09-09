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
import { UserCheck, TrendingUp, Calendar, Trophy, Target } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AssessoresModalProps {
  isOpen: boolean
  onClose: () => void
  data: DashboardMetrics['assessores'] | null
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const AssessoresModal: React.FC<AssessoresModalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] bg-white border border-gray-200">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <UserCheck className="h-5 w-5 text-green-600" />
            Assessores na Rede
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Detalhes dos assessores e seu desempenho na sua hierarquia
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] p-6 space-y-6">
          {/* Estatísticas Resumidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Total</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{data.total}</p>
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
            {/* Top Performers */}
            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-800">Melhores Performers</h3>
                </div>
                
                {data.top_performers.length > 0 ? (
                  <div className="space-y-3">
                    {data.top_performers.map((assessor, index) => (
                      <div key={assessor.assessor_id} className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-yellow-100">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-yellow-400 text-yellow-900' :
                            index === 1 ? 'bg-gray-300 text-gray-800' :
                            index === 2 ? 'bg-amber-600 text-amber-100' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{assessor.assessor_name}</h4>
                            <p className="text-xs text-gray-600">{assessor.clients_count} clientes</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-green-700">{formatCurrency(assessor.total_amount)}</p>
                          <p className="text-xs text-gray-600">{assessor.total_investments} investimentos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Trophy className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500 mt-2">Dados de performance não disponíveis</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Bottom Performers */}
            <Card className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-red-800">Precisam de Atenção</h3>
                </div>
                
                {data.bottom_performers.length > 0 ? (
                  <div className="space-y-3">
                    {data.bottom_performers.map((assessor, index) => (
                      <div key={assessor.assessor_id} className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-red-100">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{assessor.assessor_name}</h4>
                            <p className="text-xs text-gray-600">{assessor.clients_count} clientes</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-red-700">{formatCurrency(assessor.total_amount)}</p>
                          <p className="text-xs text-gray-600">{assessor.total_investments} investimentos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Target className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500 mt-2">Dados de performance não disponíveis</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Lista Completa de Assessores */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Lista Completa de Assessores</h3>
            {data.users.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{user.name}</h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={user.status === 'ATIVO' ? 'default' : 'secondary'}
                      >
                        {user.status}
                      </Badge>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Criado há</p>
                        <p className="text-sm font-medium text-gray-700">
                          {formatDistanceToNow(new Date(user.created_at), { 
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
              <div className="text-center py-8">
                <UserCheck className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">Nenhum Assessor encontrado na sua rede</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AssessoresModal