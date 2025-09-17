import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { TrendingUp, Users, DollarSign, User, Target, Calendar, Award, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

const HeadDashboard = () => {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar dados da carteira do head
  const fetchHeadStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Buscar clientes (investidores) do head
      const { data: clientes, error: clientesError } = await supabase
        .from('users')
        .select(`
          id, 
          full_name, 
          email,
          created_at,
          user_roles!inner(role_name)
        `)
        .eq('user_roles.role_name', 'Investidor')
        .eq('superior_user_id', userProfile?.id)

      if (clientesError) throw clientesError

      // Buscar investimentos dos clientes
      const clientesIds = clientes?.map(c => c.id) || []
      const { data: investimentos, error: investimentosError } = await supabase
        .from('investments')
        .select('*')
        .in('investor_user_id', clientesIds)

      if (investimentosError) throw investimentosError

      // Buscar comissões do head
      const { data: comissoes, error: comissoesError } = await supabase
        .from('commissions')
        .select('*')
        .eq('recipient_user_id', userProfile?.id)

      if (comissoesError) throw comissoesError

      // Buscar séries para análise de performance
      const { data: series, error: seriesError } = await supabase
        .from('series')
        .select('*')

      if (seriesError) throw seriesError

      // Calcular métricas gerais
      const totalInvestido = investimentos?.reduce((sum, inv) => sum + Number(inv.invested_amount), 0) || 0
      const totalComissoes = comissoes?.reduce((sum, comm) => sum + Number(comm.commission_amount), 0) || 0
      const comissoesPendentes = comissoes?.filter(c => c.payment_status === 'pending')?.reduce((sum, comm) => sum + Number(comm.commission_amount), 0) || 0
      const comissoesPagas = totalComissoes - comissoesPendentes

      // Performance individual dos investimentos
      const performanceInvestimentos = investimentos?.map(inv => {
        const serie = series?.find(s => s.id === inv.serie_id)
        const valorAtual = Number(inv.invested_amount) * (1 + (serie?.expected_return || 0) / 100)
        const retorno = valorAtual - Number(inv.invested_amount)
        const percentualRetorno = Number(inv.invested_amount) > 0 ? (retorno / Number(inv.invested_amount)) * 100 : 0
        
        return {
          id: inv.id,
          cliente: clientes?.find(c => c.id === inv.investor_user_id)?.full_name || 'N/A',
          serie: serie?.series_code || 'N/A',
          valorInvestido: Number(inv.invested_amount),
          valorAtual,
          retorno,
          percentualRetorno,
          status: inv.status,
          dataInvestimento: inv.created_at
        }
      }) || []

      // Carteira por cliente
      const carteiraPorCliente = clientes?.map(cliente => {
        const investimentosCliente = investimentos?.filter(i => i.investor_user_id === cliente.id) || []
        const totalInvestidoCliente = investimentosCliente.reduce((sum, inv) => sum + Number(inv.invested_amount), 0)
        const comissoesCliente = comissoes?.filter(c => 
          investimentosCliente.some(inv => inv.id === c.investment_id)
        ) || []
        const totalComissoesCliente = comissoesCliente.reduce((sum, comm) => sum + Number(comm.commission_amount), 0)
        
        return {
          id: cliente.id,
          nome: cliente.full_name,
          email: cliente.email,
          investimentos: investimentosCliente.length,
          totalInvestido: totalInvestidoCliente,
          totalComissoes: totalComissoesCliente,
          ultimoInvestimento: investimentosCliente.length > 0 ? 
            Math.max(...investimentosCliente.map(i => new Date(i.created_at).getTime())) : null
        }
      }).sort((a, b) => b.totalInvestido - a.totalInvestido) || []

      // Próximos vencimentos (simulado - próximos 30 dias)
      const dataAtual = new Date()
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() + 30)
      
      const proximosVencimentos = investimentos?.filter(inv => {
        if (!inv.maturity_date) return false
        const dataVencimento = new Date(inv.maturity_date)
        return dataVencimento >= dataAtual && dataVencimento <= dataLimite
      }).map(inv => ({
        cliente: clientes?.find(c => c.id === inv.investor_user_id)?.full_name || 'N/A',
        valor: Number(inv.invested_amount),
        dataVencimento: inv.maturity_date,
        serie: series?.find(s => s.id === inv.serie_id)?.series_code || 'N/A'
      })) || []

      // Distribuição por status dos investimentos
      const statusDistribution = investimentos?.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const statusData = Object.entries(statusDistribution).map(([status, count]) => ({
        name: status,
        value: count
      }))

      // Meta mensal (simulada - baseada na média dos últimos meses)
      const metaMensal = totalInvestido * 0.1 // 10% de crescimento mensal como meta
      const resultadoAtual = investimentos?.filter(inv => {
        const dataInv = new Date(inv.created_at)
        const mesAtual = new Date()
        return dataInv.getMonth() === mesAtual.getMonth() && 
               dataInv.getFullYear() === mesAtual.getFullYear()
      }).reduce((sum, inv) => sum + Number(inv.invested_amount), 0) || 0

      const percentualMeta = metaMensal > 0 ? (resultadoAtual / metaMensal) * 100 : 0

      setStats({
        clientes: clientes?.length || 0,
        totalInvestimentos: investimentos?.length || 0,
        totalInvestido,
        totalComissoes,
        comissoesPendentes,
        comissoesPagas,
        performanceInvestimentos,
        carteiraPorCliente,
        proximosVencimentos,
        statusData,
        metaMensal,
        resultadoAtual,
        percentualMeta,
        ticketMedio: investimentos?.length > 0 ? totalInvestido / investimentos.length : 0
      })
    } catch (err: any) {
      console.error('Erro ao buscar estatísticas do Head:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile?.id) {
      fetchHeadStats()
    }
  }, [userProfile?.id])

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Erro ao carregar dados</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Head</h1>
        <p className="text-gray-600 mt-2">Gestão da carteira de clientes investidores</p>
      </div>

      {/* Cards de Stats da Carteira */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Clientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.clientes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Investido</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalInvestido || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Comissões Pagas</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.comissoesPagas || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Target className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.ticketMedio || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Meta Pessoal */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Target className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Meta Mensal</h3>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Progresso</p>
            <p className="text-2xl font-bold text-blue-600">{stats?.percentualMeta?.toFixed(1)}%</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Realizado:</span>
            <span className="font-semibold">{formatCurrency(stats?.resultadoAtual || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Meta:</span>
            <span className="font-semibold">{formatCurrency(stats?.metaMensal || 0)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(stats?.percentualMeta || 0, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status dos Investimentos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status dos Investimentos</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.statusData || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats?.statusData?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Clientes */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clientes por Volume</h3>
          <div className="space-y-3">
            {stats?.carteiraPorCliente?.slice(0, 5).map((cliente: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mr-3">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{cliente.nome}</p>
                    <p className="text-sm text-gray-600">{cliente.investimentos} investimentos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(cliente.totalInvestido)}</p>
                  <p className="text-sm text-gray-600">{formatCurrency(cliente.totalComissoes)} comissões</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Próximos Vencimentos */}
      {stats?.proximosVencimentos?.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Próximos Vencimentos (30 dias)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.proximosVencimentos.map((vencimento: any, index: number) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-800">{vencimento.cliente}</span>
                  <span className="text-xs text-yellow-600">{vencimento.serie}</span>
                </div>
                <p className="text-lg font-bold text-yellow-900">{formatCurrency(vencimento.valor)}</p>
                <p className="text-sm text-yellow-700">Vence em: {formatDate(vencimento.dataVencimento)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela de Performance dos Investimentos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance Individual dos Investimentos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Série
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Investido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Atual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retorno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats?.performanceInvestimentos?.slice(0, 10).map((inv: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{inv.cliente}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{inv.serie}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(inv.valorInvestido)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600">{formatCurrency(inv.valorAtual)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${inv.retorno >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(inv.retorno)} ({inv.percentualRetorno.toFixed(2)}%)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      inv.status === 'active' ? 'bg-green-100 text-green-800' :
                      inv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default HeadDashboard
