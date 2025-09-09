import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface CreateDebentureData {
  name: string
  description?: string
  issuer_name: string
  total_emission_value: number
  emission_date: string
  expiry_date?: string
  max_capacity?: number
  terms_and_conditions?: string
}

interface CreateSeriesData {
  debenture_id: string
  series_code: string
  name: string
  description?: string
  minimum_investment: number
  maximum_investment?: number
  max_total_captation?: number
  duration_months: number
  interest_rate: number
  interest_type: string
  max_commission_percentage: number
  issue_date?: string
  expiry_date?: string
}

export function useDebentureManagement() {
  const { user } = useAuth()
  const [debentures, setDebentures] = useState([])
  const [completedDebentures, setCompletedDebentures] = useState([])
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Buscar debêntures
  const fetchDebentures = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('debentures')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDebentures(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Buscar séries
  const fetchSeries = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSeries(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Criar debênture
  const createDebenture = async (debentureData: CreateDebentureData) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('debentures')
        .insert([debentureData])
        .select()

      if (error) throw error
      
      // Atualizar lista
      fetchDebentures()
      
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Criar série
  const createSeries = async (seriesData: CreateSeriesData) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoading(true)
      setError(null)
      
      // Preparar dados completos para inserção
      const completeSeriesData = {
        debenture_id: seriesData.debenture_id,
        series_code: seriesData.series_code,
        name: seriesData.name,
        description: seriesData.description || '',
        minimum_investment: seriesData.minimum_investment || 0,
        maximum_investment: seriesData.maximum_investment || null,
        max_total_captation: seriesData.max_total_captation || null,
        duration_months: seriesData.duration_months || 12,
        interest_rate: seriesData.interest_rate || 0,
        interest_type: seriesData.interest_type || 'simple',
        max_commission_percentage: seriesData.max_commission_percentage || 5.0,
        current_captation: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('Tentando criar série:', completeSeriesData)
      
      const { data, error } = await supabase
        .from('series')
        .insert([completeSeriesData])
        .select()

      if (error) {
        console.error('Erro detalhado:', error)
        throw new Error(`Erro ao criar série: ${error.message}`)
      }
      
      // Atualizar lista
      fetchSeries()
      
      return data
    } catch (err: any) {
      console.error('Erro na criação da série:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchDebentures()
      fetchSeries()
    }
  }, [user])

  return {
    debentures: { data: debentures, isLoading: loading, error },
    completedDebentures: { data: completedDebentures, isLoading: loading, error },
    series: { data: series, isLoading: loading, error },
    createDebenture: { mutateAsync: createDebenture, isLoading: loading },
    createSeries: { mutateAsync: createSeries, isLoading: loading },
    refetch: () => {
      fetchDebentures()
      fetchSeries()
    }
  }
}