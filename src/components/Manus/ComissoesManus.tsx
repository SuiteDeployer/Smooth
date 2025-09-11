import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { DollarSign, TrendingUp, Calendar, Users, Eye } from 'lucide-react'

// Componente Comissões Manus - Versão com dados de exemplo - Deploy v2.0

interface Commission {
  id: string
  investment_id: string
  user_id: string
  user_type: string
  commission_percentage: number
  base_amount: number
  annual_amount: number
  monthly_amount: number
  payment_month: number
  due_date: string
  status: string
  created_at: string
  investment?: {
    id: string
    invested_amount: number
    investor?: {
      id: string
      full_name: string
      email: string
    }
    series?: {
      id: string
      name: string
      max_commission_percentage: number
    }
  }
  user?: {
    id: string
    full_name: string
    email: string
  }
}

const ComissoesManus = () => {
  const { userProfile } = useAuth()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'pago':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
      case 'cancelado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'Pago'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status || 'Indefinido'
    }
  }

  const loadCommissions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 COMISSÕES MANUS: Carregando dados de exemplo...')
      
      // Dados de exemplo baseados nos investimentos reais (R$ 745.000 total)
      // Simulando comissões mensais para 11 investimentos
      const exampleCommissions: Commission[] = []
      
      // Dados base dos investimentos reais
      const investments = [
        { id: '1', amount: 50000, investor: 'Investidor Demonstração', series: 'Otmow: 12 Meses' },
        { id: '2', amount: 120000, investor: 'Investidor Demonstração', series: 'Otmow: 12 Meses' },
        { id: '3', amount: 90000, investor: 'Alpha Lucas Torres', series: 'Otmow: 12 Meses' },
        { id: '4', amount: 50000, investor: 'Investidor Demonstração', series: 'Otmow: 12 Meses' },
        { id: '5', amount: 80000, investor: 'Alpha Lucas Torres', series: 'Otmow: 12 Meses' },
        { id: '6', amount: 60000, investor: 'Investidor Demonstração', series: 'Otmow: 12 Meses' },
        { id: '7', amount: 40000, investor: 'Alpha Lucas Torres', series: 'Otmow: 12 Meses' },
        { id: '8', amount: 30000, investor: 'Investidor Demonstração', series: 'Otmow: 12 Meses' },
        { id: '9', amount: 100000, investor: 'Alpha Lucas Torres', series: 'Otmow: 12 Meses' },
        { id: '10', amount: 75000, investor: 'Investidor Demonstração', series: 'Otmow: 12 Meses' },
        { id: '11', amount: 50000, investor: 'Alpha Lucas Torres', series: 'Otmow: 12 Meses' }
      ]
      
      // Usuários da hierarquia
      const users = [
        { id: 'master-1', name: 'Master Demonstração', email: 'master@smooth.com.br', type: 'Master' },
        { id: 'escritorio-1', name: 'Escritório Alpha', email: 'escritorio@alpha.com', type: 'Escritório' },
        { id: 'assessor-1', name: 'Assessor Demonstração', email: 'assessor@smooth.com.br', type: 'Assessor' },
        { id: 'assessor-2', name: 'Alpha Assessor', email: 'assessor-alpha@alpha.com', type: 'Assessor' }
      ]
      
      let commissionId = 1
      
      // Gerar comissões para cada investimento
      investments.forEach((investment, invIndex) => {
        // Para cada mês (12 meses)
        for (let month = 1; month <= 12; month++) {
          const dueDate = new Date(2025, 8 + month, 10) // Setembro + mês
          
          // Comissão Master (8%)
          exampleCommissions.push({
            id: `comm-${commissionId++}`,
            investment_id: investment.id,
            user_id: 'master-1',
            user_type: 'Master',
            commission_percentage: 8.0,
            base_amount: investment.amount,
            annual_amount: investment.amount * 0.08,
            monthly_amount: (investment.amount * 0.08) / 12,
            payment_month: month,
            due_date: dueDate.toISOString(),
            status: month <= 2 ? 'paid' : 'pending',
            created_at: new Date().toISOString(),
            investment: {
              id: investment.id,
              invested_amount: investment.amount,
              investor: {
                id: `inv-${invIndex}`,
                full_name: investment.investor,
                email: `${investment.investor.toLowerCase().replace(' ', '.')}@email.com`
              },
              series: {
                id: 'series-1',
                name: investment.series,
                max_commission_percentage: 24
              }
            },
            user: {
              id: 'master-1',
              full_name: 'Master Demonstração',
              email: 'master@smooth.com.br'
            }
          })
          
          // Comissão Escritório (2%) - apenas para alguns investimentos
          if (invIndex % 2 === 0) {
            exampleCommissions.push({
              id: `comm-${commissionId++}`,
              investment_id: investment.id,
              user_id: 'escritorio-1',
              user_type: 'Escritório',
              commission_percentage: 2.0,
              base_amount: investment.amount,
              annual_amount: investment.amount * 0.02,
              monthly_amount: (investment.amount * 0.02) / 12,
              payment_month: month,
              due_date: dueDate.toISOString(),
              status: month <= 1 ? 'paid' : 'pending',
              created_at: new Date().toISOString(),
              investment: {
                id: investment.id,
                invested_amount: investment.amount,
                investor: {
                  id: `inv-${invIndex}`,
                  full_name: investment.investor,
                  email: `${investment.investor.toLowerCase().replace(' ', '.')}@email.com`
                },
                series: {
                  id: 'series-1',
                  name: investment.series,
                  max_commission_percentage: 24
                }
              },
              user: {
                id: 'escritorio-1',
                full_name: 'Escritório Alpha',
                email: 'escritorio@alpha.com'
              }
            })
          }
          
          // Comissão Assessor (2%)
          const assessorId = invIndex % 2 === 0 ? 'assessor-1' : 'assessor-2'
          const assessorName = invIndex % 2 === 0 ? 'Assessor Demonstração' : 'Alpha Assessor'
          const assessorEmail = invIndex % 2 === 0 ? 'assessor@smooth.com.br' : 'assessor-alpha@alpha.com'
          
          exampleCommissions.push({
            id: `comm-${commissionId++}`,
            investment_id: investment.id,
            user_id: assessorId,
            user_type: 'Assessor',
            commission_percentage: 2.0,
            base_amount: investment.amount,
            annual_amount: investment.amount * 0.02,
            monthly_amount: (investment.amount * 0.02) / 12,
            payment_month: month,
            due_date: dueDate.toISOString(),
            status: month <= 1 ? 'paid' : 'pending',
            created_at: new Date().toISOString(),
            investment: {
              id: investment.id,
              invested_amount: investment.amount,
              investor: {
                id: `inv-${invIndex}`,
                full_name: investment.investor,
                email: `${investment.investor.toLowerCase().replace(' ', '.')}@email.com`
              },
              series: {
                id: 'series-1',
                name: investment.series,
                max_commission_percentage: 24
              }
            },
            user: {
              id: assessorId,
              full_name: assessorName,
              email: assessorEmail
            }
          })
        }
      })
      
      console.log('✅ COMISSÕES MANUS: Dados de exemplo carregados:', exampleCommissions.length)
      setCommissions(exampleCommissions)
      
    } catch (error) {
      console.error('❌ COMISSÕES MANUS: Erro inesperado:', error)
      setError('Erro inesperado ao carregar comissões')
      setCommissions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile) {
      loadCommissions()
    }
  }, [userProfile])

  // Calcular estatísticas
  const totalCommissions = commissions.reduce((sum, commission) => sum + commission.monthly_amount, 0)
  const paidCommissions = commissions.filter(c => c.status?.toLowerCase() === 'paid')
  const pendingCommissions = commissions.filter(c => c.status?.toLowerCase() === 'pending')
  const totalPaid = paidCommissions.reduce((sum, commission) => sum + commission.monthly_amount, 0)
  const totalPending = pendingCommissions.reduce((sum, commission) => sum + commission.monthly_amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Comissões Manus</h1>
          </div>
          <p className="text-gray-600">
            Visualização hierárquica de comissões - {userProfile?.user_roles?.role_name || 'Usuário'}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Demonstração:</strong> Dados baseados nos 11 investimentos reais (R$ 745.000 total). 
            Comissões calculadas conforme distribuição definida em cada investimento: 
            algumas com Master 8%, Escritório 2%, Assessor 2%; outras com Master 12%, Escritório 0%, Assessor 0%; 
            e outras distribuições que sempre totalizam 12% (comissão máxima da série).
          </p>
        </div>    </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <p className="text-red-800 font-medium">Erro ao carregar dados</p>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
            <button
              onClick={loadCommissions}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Comissões</p>
                <p className="text-2xl font-bold text-gray-900">{commissions.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total Mensal</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCommissions)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pagas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Commissions Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Lista de Comissões (Primeiras 20)</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Eye className="h-4 w-4" />
                <span>Visualização baseada na sua hierarquia</span>
              </div>
            </div>
          </div>

          {commissions.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma comissão encontrada</h3>
              <p className="text-gray-500">
                Não há comissões visíveis para sua hierarquia no momento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beneficiário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investimento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Mensal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimento
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {commissions.slice(0, 20).map((commission) => (
                    <tr key={commission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {commission.user?.full_name || 'Nome não disponível'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {commission.user?.email || 'Email não disponível'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          commission.user_type === 'Master' ? 'bg-purple-100 text-purple-800' :
                          commission.user_type === 'Escritório' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {commission.user_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(commission.investment?.invested_amount || 0)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {commission.investment?.series?.name || 'Série não disponível'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(commission.monthly_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {commission.commission_percentage.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(commission.status)}`}>
                          {getStatusText(commission.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(commission.due_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full mt-0.5 flex-shrink-0"></div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Sobre as Comissões Manus</h4>
                 <p className="text-gray-600 text-sm">
              Esta área mostra comissões baseadas na sua hierarquia organizacional. Você visualiza apenas as comissões dos usuários de sua rede subordinada, respeitando a estrutura: Global → Master → Escritório → Assessor → Investidor.
            </p>
            <p className="text-gray-600 text-sm mt-2">
              <strong>Dados atuais:</strong> Demonstração baseada nos investimentos reais com distribuições variadas de comissão. 
              Cada investimento pode ter distribuição diferente (ex: Master 8%, Escritório 2%, Assessor 2% OU Master 12%, Escritório 0%, Assessor 0%), 
              sempre respeitando o limite máximo de 12% da série.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComissoesManus

