import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Plus, Building, TrendingUp, Calendar } from 'lucide-react'

const DebentureManagement = () => {
  const { userProfile } = useAuth()
  const [debentures, setDebentures] = useState([])
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateDebentureForm, setShowCreateDebentureForm] = useState(false)
  const [showCreateSeriesForm, setShowCreateSeriesForm] = useState(false)
  
  const [debentureFormData, setDebentureFormData] = useState({
    name: '',
    issuer_name: '',
    total_emission_value: 0,
    emission_date: '',
    description: ''
  })

  const [seriesFormData, setSeriesFormData] = useState({
    debenture_id: '',
    series_code: '',
    name: '',
    minimum_investment: 0,
    maturity_period_months: 12,
    interest_rate: 0,
    description: ''
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [debenturesResponse, seriesResponse] = await Promise.all([
        supabase
          .from('debentures')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('series')
          .select('*, debentures (*)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
      ])

      if (debenturesResponse.error) {
        console.error('Erro ao buscar debêntures:', debenturesResponse.error)
      } else {
        setDebentures(debenturesResponse.data || [])
      }

      if (seriesResponse.error) {
        console.error('Erro ao buscar séries:', seriesResponse.error)
      } else {
        setSeries(seriesResponse.data || [])
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateDebenture = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      console.log('🚀 Criando debênture:', debentureFormData)
      
      const { data, error } = await supabase
        .from('debentures')
        .insert({
          ...debentureFormData,
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error

      console.log('✅ Debênture criada com sucesso!')
      setShowCreateDebentureForm(false)
      setDebentureFormData({
        name: '',
        issuer_name: '',
        total_emission_value: 0,
        emission_date: '',
        description: ''
      })
      loadData()
    } catch (error) {
      console.error('❌ Erro ao criar debênture:', error)
    }
  }

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      console.log('🚀 Criando série:', seriesFormData)
      
      const { data, error } = await supabase
        .from('series')
        .insert({
          ...seriesFormData,
          interest_type: 'simple',
          current_captation: 0,
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error

      console.log('✅ Série criada com sucesso!')
      setShowCreateSeriesForm(false)
      setSeriesFormData({
        debenture_id: '',
        series_code: '',
        name: '',
        minimum_investment: 0,
        maturity_period_months: 12,
        interest_rate: 0,
        description: ''
      })
      loadData()
    } catch (error) {
      console.error('❌ Erro ao criar série:', error)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Debêntures</h1>
          <p className="text-gray-600">Gerencie debêntures e séries de investimento</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateDebentureForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nova Debênture
          </button>
          <button
            onClick={() => setShowCreateSeriesForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Nova Série
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Building className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Debêntures</p>
              <p className="text-2xl font-bold text-gray-900">{Array.isArray(debentures) ? debentures.length : 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Séries Ativas</p>
              <p className="text-2xl font-bold text-gray-900">{Array.isArray(series) ? series.length : 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Total Emitido</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(Array.isArray(debentures) ? 
                  debentures.reduce((sum, deb) => sum + (Number(deb?.total_emission_value) || 0), 0) : 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Total Captado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(Array.isArray(series) ? 
                  series.reduce((sum, serie) => sum + (Number(serie?.current_captation) || 0), 0) : 0
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Message */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Status do Sistema</h2>
        {loading ? (
          <p className="text-gray-500">Carregando dados...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-700">✅ Sistema de debêntures carregado com sucesso!</p>
            <p className="text-gray-700">📊 {Array.isArray(debentures) ? debentures.length : 0} debêntures encontradas</p>
            <p className="text-gray-700">📈 {Array.isArray(series) ? series.length : 0} séries encontradas</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DebentureManagement
