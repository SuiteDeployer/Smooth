import React, { useState, useEffect } from 'react'
import { useInvestments } from '../../hooks/useInvestments'
import { useUserManagement } from '../../hooks/useUserManagement'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, TrendingUp, Calendar, DollarSign } from 'lucide-react'
import { format, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface CreateInvestmentFormData {
  series_id: string
  investor_user_id: string
  invested_amount: number
  interest_type: 'simple' | 'compound'
}

const InvestmentDashboard = () => {
  const { userProfile } = useAuth()
  const { userInvestments, availableSeries, createInvestment } = useInvestments()
  const { subordinates } = useUserManagement()
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreatingTestData, setIsCreatingTestData] = useState(false)
  const [seedingMessage, setSeedingMessage] = useState('')
  const [formData, setFormData] = useState<CreateInvestmentFormData>({
    series_id: '',
    investor_user_id: '',
    invested_amount: 0,
    interest_type: 'simple'
  })

  const canCreateInvestments = ['Global', 'Master', 'Escritório', 'Assessor'].includes(
    userProfile?.user_roles?.role_name || ''
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Data inválida'
      return format(date, 'dd/MM/yyyy', { locale: ptBR })
    } catch (error) {
      console.error('Erro ao formatar data:', error)
      return 'Erro na data'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createInvestment.mutateAsync(formData)
      setShowCreateForm(false)
      setFormData({
        series_id: '',
        investor_user_id: '',
        invested_amount: 0,
        interest_type: 'simple'
      })
    } catch (error) {
      console.error('Erro ao criar investimento:', error)
    }
  }

  const calculateMaturityValue = (investment: any) => {
    const principal = investment.invested_amount
    const rate = investment.interest_rate / 100
    
    // Validar datas antes de calcular
    let months = 12 // valor padrão
    try {
      if (investment.maturity_date && investment.investment_date) {
        const maturityDate = new Date(investment.maturity_date)
        const investmentDate = new Date(investment.investment_date)
        
        if (!isNaN(maturityDate.getTime()) && !isNaN(investmentDate.getTime())) {
          const diffTime = maturityDate.getTime() - investmentDate.getTime()
          months = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) // aproximação em meses
        }
      }
    } catch (error) {
      console.error('Erro ao calcular diferença de meses:', error)
    }
    
    if (investment.interest_type === 'compound') {
      return principal * Math.pow(1 + rate / 12, months)
    } else {
      return principal * (1 + (rate * months / 12))
    }
  }

  // Filtrar investidores disponíveis (apenas se for assessor ou acima)
  const availableInvestors = subordinates.data?.filter(user => {
    // Verificar múltiplas possibilidades de estrutura de dados
    const roleName = user.user_roles?.role_name || user.role_name
    console.log('🔍 Verificando usuário:', { 
      email: user.email, 
      full_name: user.full_name,
      role_name: user.role_name,
      user_roles: user.user_roles,
      roleName_computed: roleName 
    })
    return roleName === 'Investidor'
  }) || []

  console.log('Subordinates data:', subordinates.data)
  console.log('Available investors:', availableInvestors)
  console.log('Subordinates loading:', subordinates.isLoading)
  console.log('Subordinates error:', subordinates.error)
  console.log('Debug - Estrutura dos subordinados:', subordinates.data?.map(u => ({
    id: u.id || u.user_id,
    name: u.full_name,
    role_from_user_roles: u.user_roles?.role_name,
    role_direct: u.role_name,
    email: u.email
  })))

  // Função para criar dados de teste quando não há investidores
  const createTestInvestorData = async () => {
    if (isCreatingTestData) return
    
    setIsCreatingTestData(true)
    setSeedingMessage('Criando dados de teste...')
    
    try {
      const response = await supabase.functions.invoke('seed-investor-data')
      
      if (response.error) {
        throw new Error(response.error.message)
      }
      
      setSeedingMessage('Dados de teste criados! Atualizando lista...')
      
      // Refazer consulta de subordinados
      await queryClient.invalidateQueries({ queryKey: ['subordinates'] })
      
      setSeedingMessage('Lista atualizada com sucesso!')
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => {
        setSeedingMessage('')
      }, 3000)
      
    } catch (error) {
      console.error('Erro ao criar dados de teste:', error)
      setSeedingMessage(`Erro ao criar dados de teste: ${error.message}`)
      
      // Limpar mensagem de erro após 5 segundos
      setTimeout(() => {
        setSeedingMessage('')
      }, 5000)
    } finally {
      setIsCreatingTestData(false)
    }
  }

  // Auto-criar dados de teste quando necessário
  useEffect(() => {
    if (
      !subordinates.isLoading && 
      !subordinates.error && 
      subordinates.data && 
      availableInvestors.length === 0 &&
      canCreateInvestments &&
      !isCreatingTestData &&
      !seedingMessage
    ) {
      createTestInvestorData()
    }
  }, [subordinates.isLoading, subordinates.data, availableInvestors.length, canCreateInvestments, isCreatingTestData, seedingMessage])

  const totalInvested = userInvestments.data?.reduce((sum, inv) => sum + Number(inv.invested_amount), 0) || 0
  const totalExpected = userInvestments.data?.reduce((sum, inv) => sum + calculateMaturityValue(inv), 0) || 0
  const activeInvestments = userInvestments.data?.filter(inv => inv.status === 'active').length || 0

  return (
    <div className="p-6 space-y-6">
      {/* MENSAGEM DE TESTE - CORREÇÃO DO BUG DE INVESTIDORES */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
        <h3 className="font-bold">🚧 TESTE ATIVO - Correção do Bug Dashboard</h3>
        <p>Investidores encontrados: {availableInvestors.length}</p>
        <div className="text-xs mt-2">
          <p>Debug Subordinados: {subordinates.data?.length || 0} total</p>
          <p>Debug Investidores: {availableInvestors.map(inv => inv.full_name || inv.email).join(', ')}</p>
        </div>
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investimentos</h1>
          <p className="text-gray-600 mt-2">Gerencie os investimentos da plataforma</p>
        </div>
        
        {canCreateInvestments && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Investimento</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Investido</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvested)}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Esperado</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpected)}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Investimentos Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{activeInvestments}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Investments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Histórico de Investimentos</h2>
        </div>
        
        {userInvestments.isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ) : userInvestments.data && userInvestments.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Série
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investidor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Investido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor na Maturidade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userInvestments.data.map((investment: any) => (
                  <tr key={investment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {investment.debenture_series?.series_code || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {investment.investor?.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(investment.invested_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(investment.maturity_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        investment.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : investment.status === 'matured'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {investment.status === 'active' ? 'Ativo' : 
                         investment.status === 'matured' ? 'Vencido' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(calculateMaturityValue(investment))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">Nenhum investimento encontrado</p>
          </div>
        )}
      </div>

      {/* Create Investment Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
