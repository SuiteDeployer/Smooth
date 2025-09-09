import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Badge } from '../../ui/badge'
import { DashboardMetrics } from '../../../types/dashboard.types'
import { Building2, TrendingUp, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface EscritoriosModalProps {
  isOpen: boolean
  onClose: () => void
  data: DashboardMetrics['escritorios'] | null
}

const EscritoriosModal: React.FC<EscritoriosModalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] bg-white border border-gray-200">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Building2 className="h-5 w-5 text-indigo-600" />
            Escritórios na Rede
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Detalhes dos escritórios em sua hierarquia
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] p-6 space-y-6">
          {/* Estatísticas Resumidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-800">Total</span>
              </div>
              <p className="text-2xl font-bold text-indigo-900">{data.total}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Novos este mês</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{data.new_this_month}</p>
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

          {/* Lista de Escritórios */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Lista de Escritórios</h3>
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
                <Building2 className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">Nenhum Escritório encontrado na sua rede</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EscritoriosModal