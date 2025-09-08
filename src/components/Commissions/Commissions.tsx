import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { DollarSign, TrendingUp, Calendar } from 'lucide-react'

const Commissions = () => {
  const { userProfile } = useAuth()
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const loadCommissions = async () => {
    try {
      setLoading(true)
      
      const { data: commissionsData, error } = await supabase
        .from('commissions')
        .select(`
          *,
          investment:investments (
            *,
            investor:users!investor_user_id (id, full_name, email),
            series (*)
          ),
          recipient:users!recipient_user_id (*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar comissões:', error)
        setCommissions([])
      } else {
        console.log('✅ Comissões carregadas:', commissionsData?.length || 0)
        setCommissions(commissionsData || [])
      }
    } catch (error) {
      console.error('Erro ao carregar comissões:', error)
      setCommissions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCommissions()
  }, [])

  const totalCommissions = commissions.reduce((sum, commission) => sum + commission.commission_amount, 0)
  const paidCommissions = commissions.filter(c => c.payment_status === 'paid')
  const pendingCommissions = commissions.filter(c => c.payment_status === 'pending')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comissões</h1>
          <p className="text-gray-600">Acompanhe suas comissões de investimentos</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total em Comissões</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalCommissions)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Comissões Pagas</p>
              <p className="text-2xl font-bold text-gray-900">
                {paidCommissions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingCommissions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Comissões */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Lista de Comissões</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Carregando comissões...</p>
            </div>
          ) : commissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investimento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investidor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor da Comissão
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {commissions.map((commission) => (
                    <tr key={commission.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {commission.investment?.series?.series_code || 'N/A'} - {commission.investment?.series?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commission.investment?.investor?.full_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(commission.commission_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          commission.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : commission.payment_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {commission.payment_status === 'paid' ? 'Pago' : 
                           commission.payment_status === 'pending' ? 'Pendente' : 
                           commission.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commission.commission_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma comissão encontrada.</p>
              <p className="text-sm text-gray-400 mt-1">
                As comissões aparecerão aqui quando investimentos forem criados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Commissions
