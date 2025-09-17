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
import { Percent, DollarSign, Users, Crown, Building2, UserCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CommissionsModalProps {
  isOpen: boolean
  onClose: () => void
  data: DashboardMetrics['commissions'] | null
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'Master':
      return <Crown className="h-4 w-4" />
    case 'Escritório':
      return <Building2 className="h-4 w-4" />
    case 'Head':
      return <UserCheck className="h-4 w-4" />
    default:
      return <Users className="h-4 w-4" />
  }
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'Master':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'Escritório':
      return 'text-indigo-600 bg-indigo-50 border-indigo-200'
    case 'Head':
      return 'text-green-600 bg-green-50 border-green-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const CommissionsModal: React.FC<CommissionsModalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null

  const rolesData = [
    { role: 'Master', amount: data.by_role.Master, icon: Crown, color: 'yellow' },
    { role: 'Escritório', amount: data.by_role.Escritório, icon: Building2, color: 'indigo' },
    { role: 'Head', amount: data.by_role.Head, icon: UserCheck, color: 'green' }
  ].sort((a, b) => b.amount - a.amount)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] bg-white border border-gray-200">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Percent className="h-5 w-5 text-amber-600" />
            Comissões da Rede
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Detalhes das comissões do mês atual na sua hierarquia
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] p-6 space-y-6">
          {/* Estatísticas Resumidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Total do Mês</span>
              </div>
              <p className="text-xl font-bold text-amber-900">{formatCurrency(data.total_this_month)}</p>
              <p className="text-xs text-amber-700">{data.count_this_month} comissões</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Valor Médio</span>
              </div>
              <p className="text-xl font-bold text-blue-900">
                {data.count_this_month > 0 ? formatCurrency(data.total_this_month / data.count_this_month) : 'R$ 0,00'}
              </p>
              <p className="text-xs text-blue-700">por comissão</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Beneficiários</span>
              </div>
              <p className="text-xl font-bold text-purple-900">
                {new Set(data.recent.map(c => `${c.user_role}`)).size}
              </p>
              <p className="text-xs text-purple-700">roles diferentes</p>
            </div>
          </div>

          {/* Distribuição por Role */}
          <Card className="bg-gradient-to-br from-gray-50 to-slate-100 border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição por Role</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rolesData.map((roleData, index) => {
                  const Icon = roleData.icon
                  return (
                    <div key={roleData.role} className={`bg-white p-4 rounded-lg border-2 ${
                      roleData.color === 'yellow' ? 'border-yellow-200' :
                      roleData.color === 'indigo' ? 'border-indigo-200' :
                      'border-green-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${
                            roleData.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                            roleData.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-gray-700">{roleData.role}</span>
                        </div>
                        
                        {index === 0 && roleData.amount > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            Top
                          </Badge>
                        )}
                      </div>
                      
                      <p className={`text-2xl font-bold ${
                        roleData.color === 'yellow' ? 'text-yellow-700' :
                        roleData.color === 'indigo' ? 'text-indigo-700' :
                        'text-green-700'
                      }`}>
                        {formatCurrency(roleData.amount)}
                      </p>
                      
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              roleData.color === 'yellow' ? 'bg-yellow-400' :
                              roleData.color === 'indigo' ? 'bg-indigo-400' :
                              'bg-green-400'
                            }`}
                            style={{ 
                              width: `${data.total_this_month > 0 ? (roleData.amount / data.total_this_month) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {data.total_this_month > 0 ? ((roleData.amount / data.total_this_month) * 100).toFixed(1) : 0}% do total
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Comissões Recentes */}
          <Card className="bg-white border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Comissões Recentes</h3>
              
              {data.recent.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {data.recent.map((commission) => (
                    <div key={commission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getRoleColor(commission.user_role)}`}>
                          {getRoleIcon(commission.user_role)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{commission.user_role}</h4>
                          <p className="text-sm text-gray-600">
                            Criada {formatDistanceToNow(new Date(commission.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={commission.status === 'ATIVO' ? 'default' : 'secondary'}
                        >
                          {commission.status}
                        </Badge>
                        
                        <div className="text-right">
                          <p className="font-bold text-amber-700">{formatCurrency(commission.amount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Percent className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">Nenhuma comissão recente encontrada</p>
                </div>
              )}
            </div>
          </Card>

          {/* Análise de Performance */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-indigo-800 mb-4">Análise de Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Role com Maior Volume</h4>
                  <div className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-white">
                    {rolesData.length > 0 && rolesData[0].amount > 0 && (
                      <>
                        <div className={`p-2 rounded-lg ${
                          rolesData[0].color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                          rolesData[0].color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {React.createElement(rolesData[0].icon, { className: 'h-4 w-4' })}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{rolesData[0].role}</p>
                          <p className="text-lg font-bold text-indigo-700">{formatCurrency(rolesData[0].amount)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Participação no Total</h4>
                  <div className="space-y-2">
                    {rolesData.map((roleData) => (
                      <div key={roleData.role} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{roleData.role}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {data.total_this_month > 0 ? ((roleData.amount / data.total_this_month) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CommissionsModal