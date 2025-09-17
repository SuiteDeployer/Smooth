import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building, 
  User, 
  DollarSign,
  Target,
  Trophy,
  AlertTriangle 
} from 'lucide-react'

const GlobalDashboard = () => {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState('master')
  const [performanceData, setPerformanceData] = useState<any>(null)

  // Buscar dados de performance dos usuários
  const fetchPerformanceData = async () => {
    try {
      // Rankings por Head (volume de investimentos captados)
      const headRankingResult = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          user_roles!inner(role_name),
          investments:investments!head_user_id(invested_amount)
        `)
        .eq('user_roles.role_name', 'Head')

      // Rankings por Escritório (volume de investimentos captados pelos heades do escritório)
      const escritorioRankingResult = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          user_roles!inner(role_name)
        `)
        .eq('user_roles.role_name', 'Escritório')

      // Rankings por Master (volume de investimentos captados pela sua rede)
      const masterRankingResult = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          user_roles!inner(role_name)
        `)
        .eq('user_roles.role_name', 'Master')

      // Processar dados de heades
      const heades = headRankingResult.data?.map(head => {
        const volumeTotal = head.investments?.reduce((sum, inv) => sum + Number(inv.invested_amount || 0), 0) || 0
        return {
          nome: head.full_name,
          volume: volumeTotal,
          investimentos: head.investments?.length || 0
        }
      }).sort((a, b) => b.volume - a.volume) || []

      // Para escritórios e masters, vamos mostrar dados básicos por enquanto
      const escritorios = escritorioRankingResult.data?.map(escritorio => ({
        nome: escritorio.full_name,
        volume: 0, // Implementar lógica de agregação futuramente
        heades: 0
      })) || []

      const masters = masterRankingResult.data?.map(master => ({
        nome: master.full_name,
        volume: 0, // Implementar lógica de agregação futuramente
        escritorios: 0
      })) || []

      setPerformanceData({
        heades,
        escritorios,
        masters
      })

    } catch (err: any) {
      console.error('Erro ao buscar dados de performance:', err)
    }
  }

  // Buscar dados estatísticos
  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const currentDate = new Date()
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      
      // Buscar todos os usuários e roles primeiro  
      const [usersResult, rolesResult] = await Promise.all([
        supabase.from('users').select('id, full_name, email, created_at, role_id'),
        supabase.from('user_roles').select('id, role_name')
      ])

      if (usersResult.error) {
        console.error('Erro ao buscar usuários:', usersResult.error)
        throw new Error('Erro ao buscar dados dos usuários')
      }

      if (rolesResult.error) {
        console.error('Erro ao buscar roles:', rolesResult.error)
        throw new Error('Erro ao buscar dados dos roles')
      }

      // Criar mapa de roles
      const rolesMap = rolesResult.data?.reduce((acc, role) => {
        acc[role.id] = role.role_name
        return acc
      }, {} as Record<string, string>) || {}

      // Separar usuários por role
      const usersByRole = usersResult.data?.reduce((acc, user) => {
        const roleName = rolesMap[user.role_id] || 'Unknown'
        if (!acc[roleName]) acc[roleName] = []
        acc[roleName].push(user)
        return acc
      }, {} as Record<string, any[]>) || {}

      // Buscar dados de investimentos
      const [investmentsTotalResult, newInvestmentsResult] = await Promise.all([
        supabase.from('investments')
          .select('id, invested_amount, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('investments')
          .select('id, invested_amount, created_at')
          .gte('created_at', firstDayOfMonth.toISOString())
      ])

      // Buscar comissões da tabela correta
      const commissionsResult = await supabase.from('commission_schedules')
        .select('monthly_amount, status, payment_month')
        .eq('status', 'PENDENTE')

      // Buscar remunerações da tabela correta  
      const remuneracaoResult = await supabase.from('remuneracoes')
        .select('valor_remuneracao, status, created_at')
        .eq('status', 'PENDENTE')

      // Filtrar comissões do mês atual usando payment_month
      const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      const monthlyCommissions = commissionsResult.data?.filter(commission => 
        commission.payment_month && commission.payment_month.startsWith(currentMonthStr)
      ) || []

      // Calcular estatísticas
      const masters = usersByRole['Master'] || []
      const escritorios = usersByRole['Escritório'] || []
      const heades = usersByRole['Head'] || []
      const investidores = usersByRole['Investidor'] || []

      // Calcular novos usuários do mês
      const getNewUsersThisMonth = (users: any[]) => {
        return users.filter(user => new Date(user.created_at) >= firstDayOfMonth).length
      }

      const newMasters = getNewUsersThisMonth(masters)
      const newEscritorios = getNewUsersThisMonth(escritorios)
      const newHeades = getNewUsersThisMonth(heades)
      const newInvestidores = getNewUsersThisMonth(investidores)

      // Calcular taxas de crescimento
      const masterGrowthRate = masters.length > 0 ? ((newMasters / masters.length) * 100) : 0
      const escritorioGrowthRate = escritorios.length > 0 ? ((newEscritorios / escritorios.length) * 100) : 0
      const headGrowthRate = heades.length > 0 ? ((newHeades / heades.length) * 100) : 0
      const investidorGrowthRate = investidores.length > 0 ? ((newInvestidores / investidores.length) * 100) : 0

      const totalInvestments = investmentsTotalResult.data?.length || 0
      const newInvestments = newInvestmentsResult.data?.length || 0
      const investmentGrowthRate = totalInvestments > 0 ? ((newInvestments / totalInvestments) * 100) : 0

      const totalCommissions = commissionsResult.data?.reduce((sum, item) => sum + Number(item.monthly_amount), 0) || 0
      const totalRemuneracao = remuneracaoResult.data?.reduce((sum, item) => sum + Number(item.valor_remuneracao), 0) || 0

      // Remover dados mock - mostrar apenas dados reais básicos

      setStats({
        master: {
          total: masters.length,
          novos: newMasters,
          crescimento: masterGrowthRate
        },
        escritorio: {
          total: escritorios.length,
          novos: newEscritorios,
          crescimento: escritorioGrowthRate
        },
        head: {
          total: heades.length,
          novos: newHeades,
          crescimento: headGrowthRate
        },
        investidor: {
          total: investidores.length,
          novos: newInvestidores,
          crescimento: investidorGrowthRate
        },
        investimento: {
          total: totalInvestments,
          novos: newInvestments,
          crescimento: investmentGrowthRate
        },
        remuneracao: totalRemuneracao, // Usando dados da tabela remuneracoes
        comissoes: totalCommissions
      })
    } catch (err: any) {
      console.error('Erro ao buscar estatísticas:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchPerformanceData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const renderSection = (sectionKey: string, title: string, icon: React.ReactNode, data: any) => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center space-x-3">
          {icon}
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-gray-600 text-sm">Informações dos {title.toLowerCase()} cadastrados na plataforma</p>
        </div>

        {/* Cards de estatísticas superiores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-700 font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-2">{data.total}</p>
          </div>

          {/* Novos este mês */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm text-blue-700 font-medium">Novos este mês</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-2">{data.novos}</p>
          </div>

          {/* Taxa de crescimento */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <Target className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm text-purple-700 font-medium">Taxa de crescimento</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 mt-2">{formatPercent(data.crescimento)}</p>
          </div>
        </div>
      </div>
    )
  }

  const renderSimpleSection = (title: string, icon: React.ReactNode, data: any) => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center space-x-3">
          {icon}
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-700 font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-2">{data.total}</p>
          </div>

          {/* Novos este mês */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm text-blue-700 font-medium">Novos este mês</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-2">{data.novos}</p>
          </div>

          {/* Taxa de crescimento */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <Target className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm text-purple-700 font-medium">Taxa de crescimento</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 mt-2">{formatPercent(data.crescimento)}</p>
          </div>
        </div>
      </div>
    )
  }

  const renderValueSection = (title: string, value: number, icon: React.ReactNode, bgColor: string) => {
    return (
      <div className={`${bgColor} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(value)}</p>
        </div>
      </div>
    )
  }

  const renderRankingSection = (title: string, data: any[], type: 'head' | 'escritorio' | 'master', icon: React.ReactNode) => {
    const top5 = data.slice(0, 5)
    const bottom5 = data.slice(-5).reverse()
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center space-x-3">
          {icon}
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-green-700 flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              Top 5 Melhores
            </h3>
            <div className="space-y-2">
              {top5.length > 0 ? top5.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full">
                      {index + 1}
                    </span>
                    <span className="font-medium text-green-900">{item.nome}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-900">{formatCurrency(item.volume)}</p>
                    <p className="text-xs text-green-700">
                      {type === 'head' ? `${item.investimentos} investimentos` : 
                       type === 'escritorio' ? `${item.heades} heades` : 
                       `${item.escritorios} escritórios`}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-center">Dados insuficientes para ranking</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom 5 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-red-700 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              5 com Menor Performance
            </h3>
            <div className="space-y-2">
              {bottom5.length > 0 ? bottom5.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-6 h-6 bg-red-600 text-white text-xs font-bold rounded-full">
                      {data.length - (bottom5.length - index - 1)}
                    </span>
                    <span className="font-medium text-red-900">{item.nome}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-900">{formatCurrency(item.volume)}</p>
                    <p className="text-xs text-red-700">
                      {type === 'head' ? `${item.investimentos} investimentos` : 
                       type === 'escritorio' ? `${item.heades} heades` : 
                       `${item.escritorios} escritórios`}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-center">Dados insuficientes para ranking</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg mb-6"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Global</h1>
        <p className="text-gray-600 mt-2">Visão geral da rede e informações principais</p>
      </div>



      {/* Seção Masters */}
      {stats && renderSection('master', 'Masters na Rede', <Users className="h-6 w-6 text-blue-600" />, stats.master)}

      {/* Seção Escritórios */}
      {stats && renderSection('escritorio', 'Escritórios na Rede', <Building className="h-6 w-6 text-green-600" />, stats.escritorio)}

      {/* Seção Heades */}
      {stats && renderSection('head', 'Heades na Rede', <User className="h-6 w-6 text-purple-600" />, stats.head)}

      {/* Seção Investidores */}
      {stats && renderSimpleSection('Investidores na Rede', <Users className="h-6 w-6 text-orange-600" />, stats.investidor)}

      {/* Seção Investimentos */}
      {stats && renderSimpleSection('Investimentos na Plataforma', <TrendingUp className="h-6 w-6 text-indigo-600" />, stats.investimento)}

      {/* Seção Financeira */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats && renderValueSection(
          'Remuneração a ser paga no Mês', 
          stats.remuneracao, 
          <DollarSign className="h-6 w-6 text-green-600" />,
          'bg-green-50 border-green-200'
        )}
        
        {stats && renderValueSection(
          'Total de Comissão a ser paga no mês', 
          stats.comissoes, 
          <DollarSign className="h-6 w-6 text-blue-600" />,
          'bg-blue-50 border-blue-200'
        )}
      </div>

      {/* Seções de Performance e Rankings */}
      {performanceData && (
        <>
          {/* Ranking de Masters */}
          {renderRankingSection(
            'Performance de Masters', 
            performanceData.masters, 
            'master',
            <Users className="h-6 w-6 text-blue-600" />
          )}

          {/* Ranking de Escritórios */}
          {renderRankingSection(
            'Performance de Escritórios', 
            performanceData.escritorios, 
            'escritorio',
            <Building className="h-6 w-6 text-green-600" />
          )}

          {/* Ranking de Heades */}
          {renderRankingSection(
            'Performance de Heades', 
            performanceData.heades, 
            'head',
            <User className="h-6 w-6 text-purple-600" />
          )}
        </>
      )}
    </div>
  )
}

export default GlobalDashboard
