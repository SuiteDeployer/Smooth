import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { TrendingUp, Users, DollarSign, Building2, Target, Award, Briefcase } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

const MasterDashboard = () => {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar dados da rede sob responsabilidade do Master
  const fetchMasterStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Buscar TODOS os usuários da hierarquia usando get_user_descendants
      const { data: todosUsuarios, error: usuariosError } = await supabase
        .rpc('get_user_descendants', { input_user_id: userProfile?.id })

      if (usuariosError) throw usuariosError

      // Filtrar por tipo de usuário
      const escritorios = todosUsuarios?.filter(u => u.role_name === 'Escritório') || []
      const assessores = todosUsuarios?.filter(u => u.role_name === 'Assessor') || []
      const investidores = todosUsuarios?.filter(u => u.role_name === 'Investidor') || []

      // Buscar investimentos de TODOS os investidores da hierarquia
      const investidoresIds = investidores?.map(i => i.user_id) || []
      const { data: investimentos, error: investimentosError } = await supabase
        .from('investments')
        .select('*')
        .in('investor_user_id', investidoresIds)

      if (investimentosError) throw investimentosError

      // Buscar comissões geradas pelos assessores da hierarquia
      const assessoresIds = assessores?.map(a => a.user_id) || []
      const { data: comissoes, error: comissoesError } = await supabase
        .from('commissions')
        .select('*')
        .in('recipient_user_id', assessoresIds)

      if (comissoesError) throw comissoesError

      // Calcular métricas
      const totalInvestido = investimentos?.reduce((sum, inv) => sum + Number(inv.invested_amount), 0) || 0
      const totalComissoes = comissoes?.reduce((sum, comm) => sum + Number(comm.commission_amount), 0) || 0
      const comissoesPendentes = comissoes?.filter(c => c.payment_status === 'pending')?.reduce((sum, comm) => sum + Number(comm.commission_amount), 0) || 0

      // Performance por escritório
      const performancePorEscritorio = escritorios?.map(escritorio => {
        const assessoresEscritorio = assessores?.filter(a => a.superior_user_id === escritorio.user_id) || []
        const investidoresEscritorio = investidores?.filter(i => 
          i.superior_user_id === escritorio.user_id || // Investidores diretos do escritório
          assessoresEscritorio.some(a => a.user_id === i.superior_user_id) // Investidores via assessores
        ) || []
        const investimentosEscritorio = investimentos?.filter(i => investidoresEscritorio.some(inv => inv.user_id === i.investor_user_id)) || []
        const comissoesEscritorio = comissoes?.filter(c => assessoresEscritorio.some(a => a.user_id === c.recipient_user_id)) || []
        
        const totalInvestidoEscritorio = investimentosEscritorio.reduce((sum, inv) => sum + Number(inv.invested_amount), 0)
        const totalComissoesEscritorio = comissoesEscritorio.reduce((sum, comm) => sum + Number(comm.commission_amount), 0)
        
        return {
          nome: escritorio.full_name,
          assessores: assessoresEscritorio.length,
          investidores: investidoresEscritorio.length,
          totalInvestido: totalInvestidoEscritorio,
          totalComissoes: totalComissoesEscritorio
        }
      }) || []

      // Top assessores
      const topAssessores = assessores?.map(assessor => {
        const investidoresAssessor = investidores?.filter(i => i.superior_user_id === assessor.user_id) || []
        const investimentosAssessor = investimentos?.filter(i => investidoresAssessor.some(inv => inv.user_id === i.investor_user_id)) || []
        const comissoesAssessor = comissoes?.filter(c => c.recipient_user_id === assessor.user_id) || []
        
        const totalInvestidoAssessor = investimentosAssessor.reduce((sum, inv) => sum + Number(inv.invested_amount), 0)
        const totalComissoesAssessor = comissoesAssessor.reduce((sum, comm) => sum + Number(comm.commission_amount), 0)
        
        return {
          nome: assessor.full_name,
          clientes: investidoresAssessor.length,
          totalInvestido: totalInvestidoAssessor,
          totalComissoes: totalComissoesAssessor
        }
      }).sort((a, b) => b.totalInvestido - a.totalInvestido).slice(0, 5) || []

      setStats({
        escritorios: escritorios?.length || 0,
        assessores: assessores?.length || 0,
        investidores: investidores?.length || 0,
        totalInvestimentos: investimentos?.length || 0,
        totalInvestido,
        totalComissoes,
        comissoesPendentes,
        performancePorEscritorio,
        topAssessores
      })
    } catch (err: any) {
      console.error('Erro ao buscar estatísticas do Master:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile?.id) {
      fetchMasterStats()
    }
  }, [userProfile?.id])

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Master</h1>
        <p className="text-gray-600 mt-2">Gestão da rede de escritórios e assessores</p>
      </div>

      {/* Cards de Stats da Rede */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Escritórios</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.escritorios}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Assessores</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.assessores}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Investidores</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.investidores}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Investido</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalInvestido || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Target className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Comissões da Rede</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Gerado:</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(stats?.totalComissoes || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pendentes:</span>
              <span className="text-lg font-semibold text-yellow-600">{formatCurrency(stats?.comissoesPendentes || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pagas:</span>
              <span className="text-lg font-semibold text-blue-600">{formatCurrency((stats?.totalComissoes || 0) - (stats?.comissoesPendentes || 0))}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Resumo de Investimentos</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total de Operações:</span>
              <span className="text-xl font-bold text-blue-600">{stats?.totalInvestimentos}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ticket Médio:</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats?.totalInvestimentos > 0 ? (stats?.totalInvestido || 0) / stats?.totalInvestimentos : 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance por Escritório */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance por Escritório</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.performancePorEscritorio || []}>
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
                <Bar dataKey="totalInvestido" fill="#3B82F6" name="Total Investido" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Assessores */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Award className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Top 5 Assessores</h3>
          </div>
          <div className="space-y-3">
            {stats?.topAssessores?.map((assessor: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mr-3">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{assessor.nome}</p>
                    <p className="text-sm text-gray-600">{assessor.clientes} clientes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(assessor.totalInvestido)}</p>
                  <p className="text-sm text-gray-600">{formatCurrency(assessor.totalComissoes)} comissões</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Escritórios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detalhamento por Escritório</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Escritório
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assessores
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Investidores
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Investido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comissões
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats?.performancePorEscritorio?.map((escritorio: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{escritorio.nome}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{escritorio.assessores}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{escritorio.investidores}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-green-600">{formatCurrency(escritorio.totalInvestido)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600">{formatCurrency(escritorio.totalComissoes)}</div>
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

export default MasterDashboard
