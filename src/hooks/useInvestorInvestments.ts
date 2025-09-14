import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Investment {
  id: string
  series_id: string
  investor_user_id: string
  assessor_user_id: string
  master_user_id: string         // ✅ Adicionado
  escritorio_user_id: string     // ✅ Adicionado
  global_user_id?: string | null // ✅ Adicionado (opcional)
  invested_amount: number
  investment_date: string
  maturity_date: string
  interest_rate: number
  interest_type: string
  commission_master?: number      // ✅ Adicionado
  commission_escritorio?: number  // ✅ Adicionado
  commission_assessor?: number    // ✅ Adicionado
  commission_global?: number      // ✅ Adicionado (opcional)
  status: string
  series: {
    id: string
    series_code: string
    name: string
  }
}

export interface InvestmentStats {
  total_investments: number
  total_invested: number
  avg_interest_rate: number
  active_investments: number
}

export function useInvestorInvestments() {
  const { user, userProfile } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [stats, setStats] = useState<InvestmentStats>({
    total_investments: 0,
    total_invested: 0,
    avg_interest_rate: 0,
    active_investments: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvestments = async () => {
    try {
      if (!user || !userProfile) {
        throw new Error('Usuário não autenticado ou perfil não carregado')
      }

      setIsLoading(true)
      setError(null)

      // Buscar investimentos do usuário logado
      const { data: investmentsData, error: investmentsError } = await supabase
        .from('investments')
        .select(`
          id,
          invested_amount,
          investment_date,
          maturity_date,
          interest_rate,
          interest_type,
          status,
          series:series_id (
            id,
            series_code,
            name
          )
        `)
        .eq('investor_user_id', userProfile.id)
        .order('investment_date', { ascending: false })

      if (investmentsError) throw investmentsError

      // Processar dados para garantir tipo correto
      const investments = (investmentsData || []).map(inv => ({
        ...inv,
        series: Array.isArray(inv.series) ? inv.series[0] : inv.series
      })) as Investment[]
      
      setInvestments(investments)

      // Calcular estatísticas
      const activeInvestments = investments.filter(inv => inv.status === 'active')
      const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.invested_amount, 0)
      const avgInterestRate = activeInvestments.length > 0 
        ? activeInvestments.reduce((sum, inv) => sum + inv.interest_rate, 0) / activeInvestments.length
        : 0

      setStats({
        total_investments: investments.length,
        total_invested: totalInvested,
        avg_interest_rate: avgInterestRate,
        active_investments: activeInvestments.length
      })

      console.log('✅ Investimentos carregados:', investments.length)
      
    } catch (err: any) {
      console.error('❌ Erro ao carregar investimentos:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user && userProfile) {
      fetchInvestments()
    }
  }, [user, userProfile])

  return {
    investments,
    stats,
    isLoading,
    error,
    refetch: fetchInvestments
  }
}
