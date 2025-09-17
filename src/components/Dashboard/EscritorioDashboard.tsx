import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { TrendingUp, Users, DollarSign, User, Target, Clock, Briefcase, PlusCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'

const EscritorioDashboard = () => {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar dados do escritório
  const fetchEscritorioStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Buscar heades subordinados ao Escritório
      const { data: heades, error: headesError } = await supabase
        .from('users')
        .select(`
          id, 
          full_name, 
          email,
          created_at,
          user_roles!inner(role_name)
        `)
        .eq('user_roles.role_name', 'Head')
        .eq('superior_user_id', userProfile?.id)

      if (headesError) throw headesError

      // Buscar investidores ligados aos heades
      const headesIds = heades?.map(a => a.id) || []
      const { data: investidores, error: investidoresError } = await supabase
        .from('users')
        .select(`
          id, 
          full_name, 
          email,
          created_at,
          user_roles!inner(role_name),
          superior_user_id
        `)
        .eq('user_roles.role_name', 'Investidor')
        .in('superior_user_id', headesIds)

      if (investidoresError) throw investidoresError

      // Buscar investimentos dos investidores
      const investidoresIds = investidores?.map(i => i.id) || []
      const { data: investimentos, error: investimentosError } = await supabase
        .from('investments')
        .select('*')
        .in('investor_user_id', investidoresIds)

      if (investimentosError) throw investimentosError

      // Buscar comissões dos heades
      const { data: comissoes, error: comissoesError } = await supabase
        .from('commissions')
        .select('*')
        .in('recipient_user_id', headesIds)

      if (comissoesError) throw comissoesError

      // Calcular métricas gerais
      const totalInvestido = investimentos?.reduce((sum, inv) => sum + Number(inv.invested_amount), 0) || 0
      const totalComissoes = comissoes?.reduce((sum, comm) => sum + Number(comm.commission_amount), 0) || 0
      const comissoesPendentes = comissoes?.filter(c => c.payment_status === 'pending')?.reduce((sum, comm) => sum + Number(comm.commission_amount), 0) || 0

      // Performance por head
      const performancePorHead = heades?.map(head => {
        const investidoresHead = investidores?.filter(i => i.superior_user_id === head.id) || []
        const investimentosHead = investimentos?.filter(i => investidoresHead.some(inv => inv.id === i.investor_user_id)) || []
        const comissoesHead = comissoes?.filter(c => c.recipient_user_id === head.id) || []
        
        const totalInvestidoHead = investimentosHead.reduce((sum, inv) => sum + Number(inv.invested_amount), 0)
        const totalComissoesHead = comissoesHead.reduce((sum, comm) => sum + Number(comm.commission_amount), 0)
        
        return {
          id: head.id,
          nome: head.full_name,
          email: head.email,
          clientes: investidoresHead.length,
          investimentos: investimentosHead.length,
          totalInvestido: totalInvestidoHead,
          totalComissoes: totalComissoesHead,
          ticketMedio: investimentosHead.length > 0 ? totalInvestidoHead / investimentosHead.length : 0
        }
      }).sort((a, b) => b.totalInvestido - a.totalInvestido) || []

      // Investimentos recentes (últimos 30 dias)
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - 30)
      
      const investimentosRecentes = investimentos?.filter(inv => 
        new Date(inv.created_at) >= dataLimite
      ) || []

      // Crescimento mensal (simulado baseado nos dados disponíveis)
      const crescimentoMensal = []
      for (let i = 5; i >= 0; i--) {
        const dataInicio = new Date()
        dataInicio.setMonth(dataInicio.getMonth() - i)
        dataInicio.setDate(1)
        
        const dataFim = new Date(dataInicio)
        dataFim.setMonth(dataFim.getMonth() + 1)
        
        const investimentosMes = investimentos?.filter(inv => {
          const dataInv = new Date(inv.created_at)
          return dataInv >= dataInicio && dataInv < dataFim
        }) || []
        
        const totalMes = investimentosMes.reduce((sum, inv) => sum + Number(inv.invested_amount), 0)
        
        crescimentoMensal.push({
          mes: dataInicio.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          valor: totalMes,
          quantidade: investimentosMes.length
        })
      }

      // Pipeline (investimentos pendentes ou em análise)
      const pipeline = investimentos?.filter(inv => inv.status === 'pending' || inv.status === 'analysis') || []
      const valorPipeline = pipeline.reduce((sum, inv) => sum + Number(inv.invested_amount), 0)

      setStats({
        heades: heades?.length || 0,
        investidores: investidores?.length || 0,
        totalInvestimentos: investimentos?.length || 0,
        totalInvestido,
        totalComissoes,
        comissoesPendentes,
        performancePorHead,
        investimentosRecentes: investimentosRecentes.length,
        crescimentoMensal,
        pipeline: pipeline.length,
        valorPipeline,
        ticketMedio: investimentos?.length > 0 ? totalInvestido / investimentos.length : 0
      })
    } catch (err: any) {
      console.error('Erro ao buscar estatísticas do Escritório:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile?.id) {
      fetchEscritorioStats()
    }
  }, [userProfile?.id])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Escritório</h1>
        <p className="text-gray-600 mt-2">Gestão dos heades e investidores do escritório</p>
      </div>

      {/* Cards de Stats do Escritório */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Heades</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.heades}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Investidores</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.investidores}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Investido</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalInvestido || 0)}</p>
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

      {/* Métricas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Investimentos Recentes</p>
              <p className="text-xl font-bold text-blue-600">{stats?.investimentosRecentes}</p>
              <p className="text-xs text-gray-500">Últimos 30 dias</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pipeline</p>
              <p className="text-xl font-bold text-orange-600">{stats?.pipeline}</p>
              <p className="text-xs text-gray-500">{formatCurrency(stats?.valorPipeline || 0)}</p>
            </div>
            <PlusCircle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Comissões Pendentes</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(stats?.comissoesPendentes || 0)}</p>
              <p className="text-xs text-gray-500">A receber</p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crescimento Mensal */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Crescimento Mensal</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.crescimentoMensal || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                  name="Valor Investido"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance por Head */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance por Head</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.performancePorHead || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="nome" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="totalInvestido" fill="#10B981" name="Total Investido" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela de Heades */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detalhamento dos Heades</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Head
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clientes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Investimentos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Investido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Médio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comissões
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats?.performancePorHead?.map((head: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{head.nome}</div>
                      <div className="text-sm text-gray-500">{head.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{head.clientes}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{head.investimentos}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-green-600">{formatCurrency(head.totalInvestido)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(head.ticketMedio)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600">{formatCurrency(head.totalComissoes)}</div>
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

export default EscritorioDashboard
