import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { TrendingUp, DollarSign, Calendar, Target, Award, PieChart, BarChart3, Clock, Download } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from 'recharts'

const InvestorPortfolio = () => {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar dados completos do investidor
  const fetchInvestorStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Buscar investimentos do investidor
      const { data: investimentos, error: investimentosError } = await supabase
        .from('investments')
        .select(`
          *,
          series(*)
        `)
        .eq('investor_user_id', userProfile?.id)

      if (investimentosError) throw investimentosError

      // Buscar dados de benchmarks (CDI e Tesouro - simulados)
      const cdiAtual = 13.75 // CDI anual atual (%)
      const tesouroDiretoAtual = 12.50 // Tesouro Direto anual atual (%)

      // Calcular performance dos investimentos
      const totalInvestido = investimentos?.reduce((sum, inv) => sum + Number(inv.invested_amount), 0) || 0
      
      const performanceInvestimentos = investimentos?.map(inv => {
        const serie = inv.series
        const mesesInvestido = serie?.duration_months || 12
        const retornoEsperado = serie?.expected_return || 15
        
        // Calcular valor atual com base no retorno esperado da série
        const valorAtual = Number(inv.invested_amount) * (1 + (retornoEsperado / 100) * (mesesInvestido / 12))
        const retorno = valorAtual - Number(inv.invested_amount)
        const percentualRetorno = Number(inv.invested_amount) > 0 ? (retorno / Number(inv.invested_amount)) * 100 : 0
        
        // Comparativo com benchmarks
        const valorCDI = Number(inv.invested_amount) * (1 + (cdiAtual / 100) * (mesesInvestido / 12))
        const valorTesouro = Number(inv.invested_amount) * (1 + (tesouroDiretoAtual / 100) * (mesesInvestido / 12))
        
        const diferencaCDI = valorAtual - valorCDI
        const diferencaTesouro = valorAtual - valorTesouro
        
        return {
          id: inv.id,
          serie: serie?.series_code || 'N/A',
          valorInvestido: Number(inv.invested_amount),
          valorAtual,
          retorno,
          percentualRetorno,
          retornoEsperado,
          mesesInvestido,
          dataInvestimento: inv.created_at,
          dataVencimento: inv.maturity_date,
          valorCDI,
          valorTesouro,
          diferencaCDI,
          diferencaTesouro,
          status: inv.status
        }
      }) || []

      // Calcular totais
      const totalAtual = performanceInvestimentos.reduce((sum, inv) => sum + inv.valorAtual, 0)
      const totalRetorno = totalAtual - totalInvestido
      const percentualRetornoTotal = totalInvestido > 0 ? (totalRetorno / totalInvestido) * 100 : 0

      // Comparativo total com benchmarks
      const totalCDI = performanceInvestimentos.reduce((sum, inv) => sum + inv.valorCDI, 0)
      const totalTesouro = performanceInvestimentos.reduce((sum, inv) => sum + inv.valorTesouro, 0)
      
      const diferençaTotalCDI = totalAtual - totalCDI
      const diferençaTotalTesouro = totalAtual - totalTesouro

      // Próximos saques/vencimentos
      const proximosVencimentos = performanceInvestimentos
        .filter(inv => inv.dataVencimento)
        .map(inv => ({
          ...inv,
          diasParaVencimento: Math.ceil((new Date(inv.dataVencimento).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        }))
        .sort((a, b) => a.diasParaVencimento - b.diasParaVencimento)
        .slice(0, 5)

      // Distribuição por série
      const distribuicaoPorSerie = performanceInvestimentos.reduce((acc, inv) => {
        const serie = inv.serie
        if (!acc[serie]) {
          acc[serie] = { nome: serie, valor: 0, quantidade: 0 }
        }
        acc[serie].valor += inv.valorAtual
        acc[serie].quantidade += 1
        return acc
      }, {} as Record<string, any>)

      const dadosDistribuicao = Object.values(distribuicaoPorSerie)

      // Histórico de performance (simulado - últimos 12 meses)
      const historicoPerformance = []
      for (let i = 11; i >= 0; i--) {
        const data = new Date()
        data.setMonth(data.getMonth() - i)
        
        const valorMes = totalInvestido * (1 + (Math.random() * 0.05 + 0.01) * (12 - i)) // Crescimento simulado
        const valorCDIMes = totalInvestido * (1 + (cdiAtual / 100) * ((12 - i) / 12))
        const valorTesouroMes = totalInvestido * (1 + (tesouroDiretoAtual / 100) * ((12 - i) / 12))
        
        historicoPerformance.push({
          mes: data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          meuPortfolio: valorMes,
          cdi: valorCDIMes,
          tesouro: valorTesouroMes
        })
      }

      // Remuneração mensal estimada
      const remuneracaoMensal = performanceInvestimentos.reduce((sum, inv) => {
        const remuneracaoMensalInv = (inv.valorAtual - inv.valorInvestido) / (inv.mesesInvestido || 12)
        return sum + remuneracaoMensalInv
      }, 0)

      setStats({
        totalInvestido,
        totalAtual,
        totalRetorno,
        percentualRetornoTotal,
        totalCDI,
        totalTesouro,
        diferençaTotalCDI,
        diferençaTotalTesouro,
        performanceInvestimentos,
        proximosVencimentos,
        dadosDistribuicao,
        historicoPerformance,
        remuneracaoMensal,
        cdiAtual,
        tesouroDiretoAtual
      })
    } catch (err: any) {
      console.error('Erro ao buscar dados do investidor:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile?.id) {
      fetchInvestorStats()
    }
  }, [userProfile?.id])

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

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
        <h1 className="text-3xl font-bold text-gray-900">Meu Portfólio</h1>
        <p className="text-gray-600 mt-2">Visão completa dos seus investimentos e performance</p>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Investido</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalInvestido || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Valor Atual</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalAtual || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Retorno Total</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalRetorno || 0)}</p>
              <p className="text-xs text-gray-500">{stats?.percentualRetornoTotal?.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Renda Mensal</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.remuneracaoMensal || 0)}</p>
              <p className="text-xs text-gray-500">Estimativa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparativo com Benchmarks */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparativo com Benchmarks</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900">Meu Portfólio</h4>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats?.totalAtual || 0)}</p>
            <p className="text-sm text-blue-700">{stats?.percentualRetornoTotal?.toFixed(2)}%</p>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <h4 className="font-semibold text-orange-900">CDI ({stats?.cdiAtual}% a.a.)</h4>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats?.totalCDI || 0)}</p>
            <p className={`text-sm font-semibold ${stats?.diferençaTotalCDI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats?.diferençaTotalCDI >= 0 ? '+' : ''}{formatCurrency(stats?.diferençaTotalCDI || 0)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <h4 className="font-semibold text-purple-900">Tesouro Direto ({stats?.tesouroDiretoAtual}% a.a.)</h4>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats?.totalTesouro || 0)}</p>
            <p className={`text-sm font-semibold ${stats?.diferençaTotalTesouro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats?.diferençaTotalTesouro >= 0 ? '+' : ''}{formatCurrency(stats?.diferençaTotalTesouro || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico de Performance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução vs Benchmarks</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.historicoPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line 
                  type="monotone" 
                  dataKey="meuPortfolio" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  name="Meu Portfólio"
                />
                <Line 
                  type="monotone" 
                  dataKey="cdi" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="CDI"
                />
                <Line 
                  type="monotone" 
                  dataKey="tesouro" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Tesouro Direto"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Série */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Série</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={stats?.dadosDistribuicao || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ nome, value }) => `${nome}: ${formatCurrency(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="valor"
                >
                  {stats?.dadosDistribuicao?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Próximos Vencimentos */}
      {stats?.proximosVencimentos?.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Clock className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Próximos Vencimentos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.proximosVencimentos.map((vencimento: any, index: number) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">{vencimento.serie}</span>
                  <span className="text-xs text-blue-600">{vencimento.diasParaVencimento} dias</span>
                </div>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(vencimento.valorAtual)}</p>
                <p className="text-sm text-blue-700">Vence: {formatDate(vencimento.dataVencimento)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalhamento dos Investimentos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Detalhamento dos Investimentos</h3>
            <button className="flex items-center text-blue-600 hover:text-blue-800">
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
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
                  vs CDI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  vs Tesouro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retorno
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats?.performanceInvestimentos?.map((inv: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{inv.serie}</div>
                    <div className="text-sm text-gray-500">{formatDate(inv.dataInvestimento)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(inv.valorInvestido)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600">{formatCurrency(inv.valorAtual)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${inv.diferencaCDI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inv.diferencaCDI >= 0 ? '+' : ''}{formatCurrency(inv.diferencaCDI)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${inv.diferencaTesouro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inv.diferencaTesouro >= 0 ? '+' : ''}{formatCurrency(inv.diferencaTesouro)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${inv.retorno >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(inv.retorno)} ({inv.percentualRetorno.toFixed(2)}%)
                    </div>
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

export default InvestorPortfolio
