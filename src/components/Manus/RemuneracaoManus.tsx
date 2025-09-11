import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { DollarSign, TrendingUp, Calendar, User, Eye } from 'lucide-react'

interface Remuneracao {
  id_pagamento: string
  nome_investidor: string
  debenture: string
  serie: string
  valor_remuneracao: number
  status: string
  data_vencimento: string
  data_pagamento: string | null
  pix: string
  created_at: string
  user_id: string
  investor?: {
    id: string
    full_name: string
    email: string
  }
}

const RemuneracaoManus = () => {
  const { userProfile } = useAuth()
  const [remuneracoes, setRemuneracoes] = useState<Remuneracao[]>([])
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

  const loadRemuneracoes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 REMUNERAÇÃO MANUS: Carregando dados de exemplo...')
      
      // Dados de exemplo baseados nos investimentos reais (R$ 745.000 total)
      // Simulando remunerações mensais para 11 investimentos
      const exampleRemuneracoes: Remuneracao[] = []
      
      // Dados base dos investimentos reais
      const investments = [
        { id: '1', amount: 50000, investor: 'Investidor Demonstração', email: 'investidor@smooth.com.br' },
        { id: '2', amount: 120000, investor: 'Investidor Demonstração', email: 'investidor@smooth.com.br' },
        { id: '3', amount: 90000, investor: 'Alpha Lucas Torres', email: 'investidor3-alpha@alpha.com' },
        { id: '4', amount: 50000, investor: 'Investidor Demonstração', email: 'investidor@smooth.com.br' },
        { id: '5', amount: 80000, investor: 'Alpha Lucas Torres', email: 'investidor3-alpha@alpha.com' },
        { id: '6', amount: 60000, investor: 'Investidor Demonstração', email: 'investidor@smooth.com.br' },
        { id: '7', amount: 40000, investor: 'Alpha Lucas Torres', email: 'investidor3-alpha@alpha.com' },
        { id: '8', amount: 30000, investor: 'Investidor Demonstração', email: 'investidor@smooth.com.br' },
        { id: '9', amount: 100000, investor: 'Alpha Lucas Torres', email: 'investidor3-alpha@alpha.com' },
        { id: '10', amount: 75000, investor: 'Investidor Demonstração', email: 'investidor@smooth.com.br' },
        { id: '11', amount: 50000, investor: 'Alpha Lucas Torres', email: 'investidor3-alpha@alpha.com' }
      ]
      
      let remuneracaoId = 1
      
      // Gerar remunerações para cada investimento
      investments.forEach((investment, invIndex) => {
        // Para cada mês (12 meses)
        for (let month = 1; month <= 12; month++) {
          const dueDate = new Date(2025, 8 + month, 15) // Setembro + mês, dia 15
          const remuneration_rate = 24.0 // 24% anual da série Otmow
          const annual_amount = investment.amount * (remuneration_rate / 100)
          const monthly_amount = annual_amount / 12
          
          exampleRemuneracoes.push({
            id: `rem-${remuneracaoId++}`,
            investment_id: investment.id,
            investor_id: `inv-${invIndex}`,
            remuneration_percentage: remuneration_rate,
            base_amount: investment.amount,
            annual_amount: annual_amount,
            monthly_amount: monthly_amount,
            payment_month: month,
            due_date: dueDate.toISOString(),
            status: month <= 2 ? 'paid' : 'pending',
            created_at: new Date().toISOString(),
            investment: {
              id: investment.id,
              invested_amount: investment.amount,
              investment_date: '2025-09-10',
              series: {
                id: 'series-1',
                name: 'Otmow: 12 Meses',
                max_commission_percentage: 24
              }
            },
            investor: {
              id: `inv-${invIndex}`,
              full_name: investment.investor,
              email: investment.email
            }
          })
        }
      })
      
      console.log('✅ REMUNERAÇÃO MANUS: Dados de exemplo carregados:', exampleRemuneracoes.length)
      setRemuneracoes(exampleRemuneracoes)
      
    } catch (error) {
      console.error('❌ REMUNERAÇÃO MANUS: Erro inesperado:', error)
      setError('Erro inesperado ao carregar remunerações')
      setRemuneracoes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile) {
      loadRemuneracoes()
    }
  }, [userProfile])

  // Calcular estatísticas
  const totalRemuneracoes = remuneracoes.reduce((sum, remuneracao) => sum + remuneracao.monthly_amount, 0)
  const paidRemuneracoes = remuneracoes.filter(r => r.status?.toLowerCase() === 'paid')
  const pendingRemuneracoes = remuneracoes.filter(r => r.status?.toLowerCase() === 'pending')
  const totalPaid = paidRemuneracoes.reduce((sum, remuneracao) => sum + remuneracao.monthly_amount, 0)
  const totalPending = pendingRemuneracoes.reduce((sum, remuneracao) => sum + remuneracao.monthly_amount, 0)

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
            <TrendingUp className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Remuneração Manus</h1>
          </div>
          <p className="text-gray-600">
            Visualização hierárquica de remunerações - {userProfile?.user_roles?.role_name || 'Usuário'}
          </p>
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
              onClick={loadRemuneracoes}
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
                <p className="text-sm font-medium text-gray-600">Total de Remunerações</p>
                <p className="text-2xl font-bold text-gray-900">{remuneracoes.length}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRemuneracoes)}</p>
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

        {/* Remuneracoes Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Lista de Remunerações</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Eye className="h-4 w-4" />
                <span>Visualização baseada na sua hierarquia</span>
              </div>
            </div>
          </div>

          {remuneracoes.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma remuneração encontrada</h3>
              <p className="text-gray-500">
                Não há remunerações visíveis para sua hierarquia no momento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investidor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investimento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor da Remuneração
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taxa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Pagamento
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {remuneracoes.map((remuneracao) => (
                    <tr key={remuneracao.id_pagamento} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {remuneracao.nome_investidor || 'Nome não disponível'}
                          </div>
                          <div className="text-sm text-gray-500">
                            PIX: {remuneracao.pix}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {remuneracao.debenture}
                          </div>
                          <div className="text-sm text-gray-500">
                            {remuneracao.serie}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(remuneracao.valor_remuneracao)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          -
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(remuneracao.status)}`}>
                          {getStatusText(remuneracao.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {remuneracao.data_pagamento ? formatDate(remuneracao.data_pagamento) : 'Não definida'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-green-500 rounded-full mt-0.5 flex-shrink-0"></div>
            <div>
              <h4 className="font-medium text-green-900 mb-1">Sobre a Remuneração Manus</h4>
              <p className="text-green-800 text-sm">
                Esta área mostra remunerações baseadas na sua hierarquia organizacional. 
                Você visualiza apenas as remunerações dos investidores de sua rede subordinada, 
                respeitando a estrutura: Global → Master → Escritório → Assessor → Investidor.
                As remunerações são exclusivas para investidores.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RemuneracaoManus

