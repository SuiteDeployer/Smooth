import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Plus, Building, TrendingUp, Calendar, Lock, Edit, Trash2, X, CheckCircle, XCircle } from 'lucide-react'

const DebentureManagement = () => {
  const { userProfile } = useAuth()
  const [debentures, setDebentures] = useState([])
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateDebentureForm, setShowCreateDebentureForm] = useState(false)
  const [showCreateSeriesForm, setShowCreateSeriesForm] = useState(false)
  const [showEditDebentureForm, setShowEditDebentureForm] = useState(false)
  const [showEditSeriesForm, setShowEditSeriesForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteItem, setDeleteItem] = useState(null)
  const [deleteType, setDeleteType] = useState('')
  const [editingDebenture, setEditingDebenture] = useState(null)
  const [editingSeriesForm, setEditingSeriesForm] = useState({
    id: '',
    name: '',
    description: '',
    duration_months: '12',
    interest_rate: '0',
    minimum_investment: '0',
    max_commission_percentage: '5.0'
  })
  
  const [debentureFormData, setDebentureFormData] = useState({
    name: '',
    issuer_name: '',
    total_emission_value: 0,
    emission_date: '',
    maturity_date: '',
    description: ''
  })

  const [seriesFormData, setSeriesFormData] = useState({
    debenture_id: '',
    series_code: '',
    name: '',
    minimum_investment: 0,
    duration_months: 12,
    interest_rate: 0,
    max_commission_percentage: 5.0,
    description: ''
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Função para formatar valores grandes de forma compacta
  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `R$ ${(value / 1000000000).toFixed(2)}B`
    } else if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2)}M`
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`
    } else {
      return formatCurrency(value)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informada'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Função para determinar se uma debênture está ativa ou vencida
  const getDebentureStatus = (maturityDate: string) => {
    if (!maturityDate) return { status: 'active', label: 'Ativa', className: 'bg-green-100 text-green-800' }
    
    const today = new Date()
    const maturity = new Date(maturityDate)
    
    if (maturity < today) {
      return { status: 'expired', label: 'Vencida', className: 'bg-red-100 text-red-800' }
    } else {
      return { status: 'active', label: 'Ativa', className: 'bg-green-100 text-green-800' }
    }
  }

  // Separar debentures ativas e vencidas
  const separateDebenturesByStatus = (debentures: any[]) => {
    const active = debentures.filter(deb => getDebentureStatus(deb.maturity_date).status === 'active')
    const expired = debentures.filter(deb => getDebentureStatus(deb.maturity_date).status === 'expired')
    return { active, expired }
  }

  // Verificar se o usuário é Global
  const isGlobalUser = () => {
    return userProfile?.user_roles?.role_name === 'Global'
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
      
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Usuário não autenticado')
        return
      }

      // Buscar dados do usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (userError || !userData) {
        console.error('Erro ao buscar dados do usuário:', userError)
        alert('Erro ao identificar usuário')
        return
      }
      
      const { data, error } = await supabase
        .from('debentures')
        .insert({
          ...debentureFormData,
          status: 'active',
          created_by: userData.id
        })
        .select()
        .single()

      if (error) {
        console.error('Erro detalhado:', error)
        throw error
      }

      console.log('✅ Debênture criada com sucesso!')
      setShowCreateDebentureForm(false)
      setDebentureFormData({
        name: '',
        issuer_name: '',
        total_emission_value: 0,
        emission_date: '',
        maturity_date: '',
        description: ''
      })
      loadData()
      alert('Debênture criada com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao criar debênture:', error)
      alert(`Erro ao criar debênture: ${error.message || 'Erro desconhecido'}`)
    }
  }

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      console.log('🚀 Criando série:', seriesFormData)
      
      // Verificar se há debêntures disponíveis
      if (!seriesFormData.debenture_id) {
        alert('Por favor, selecione uma debênture.')
        return
      }

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Usuário não autenticado')
        return
      }

      // Preparar dados completos para inserção
      const completeSeriesData = {
        debenture_id: seriesFormData.debenture_id,
        series_code: seriesFormData.series_code,
        name: seriesFormData.name,
        description: seriesFormData.description || '',
        minimum_investment: seriesFormData.minimum_investment || 0,
        maximum_investment: null,
        max_total_captation: null,
        duration_months: seriesFormData.duration_months || 12,
        interest_rate: seriesFormData.interest_rate || 0,
        interest_type: 'simple',
        max_commission_percentage: seriesFormData.max_commission_percentage || 5.0,
        current_captation: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('📝 Dados da série a serem inseridos:', completeSeriesData)
      
      const { data, error } = await supabase
        .from('series')
        .insert([completeSeriesData])
        .select()

      if (error) {
        console.error('🚫 Erro detalhado:', error)
        throw new Error(`Erro ao criar série: ${error.message}`)
      }

      console.log('✅ Série criada com sucesso:', data)
      
      // Reset form and close modal
      setShowCreateSeriesForm(false)
      setSeriesFormData({
        debenture_id: '',
        series_code: '',
        name: '',
        minimum_investment: 0,
        duration_months: 12,
        interest_rate: 0,
        max_commission_percentage: 5.0,
        description: ''
      })
      
      // Reload data
      loadData()
      
      alert('Série criada com sucesso!')
      
    } catch (error) {
      console.error('❌ Erro ao criar série:', error)
      alert(`Erro ao criar série: ${error.message || 'Erro desconhecido'}`)
    }
  }

  // Funções de edição e exclusão
  const handleEditDebenture = (debenture) => {
    setEditingDebenture({
      id: debenture.id,
      name: debenture.name || '',
      description: debenture.description || '',
      maturity_date: debenture.maturity_date || ''
    })
    setShowEditDebentureForm(true)
  }

  const handleEditSeries = (serie) => {
    setEditingSeriesForm({
      id: serie.id,
      name: serie.name || '',
      description: serie.description || '',
      duration_months: String(serie.duration_months || 12),
      interest_rate: String(serie.interest_rate || 0),
      minimum_investment: String(serie.minimum_investment || 0),
      max_commission_percentage: String(serie.max_commission_percentage || 5.0)
    })
    setShowEditSeriesForm(true)
  }

  const handleDeleteConfirm = (item, type) => {
    setDeleteItem(item)
    setDeleteType(type)
    setShowDeleteConfirm(true)
  }

  const handleUpdateDebenture = async (e) => {
    e.preventDefault()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão não encontrada')

      const response = await fetch(`https://cisoewbdzdxombthxqfi.supabase.co/functions/v1/update-debenture`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          debenture_id: editingDebenture.id,
          name: editingDebenture.name,
          description: editingDebenture.description,
          maturity_date: editingDebenture.maturity_date
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Erro ao atualizar debênture')
      }

      console.log('✅ Debênture atualizada com sucesso!')
      setShowEditDebentureForm(false)
      setEditingDebenture(null)
      loadData()
    } catch (error) {
      console.error('❌ Erro ao atualizar debênture:', error)
      alert(`Erro ao atualizar debênture: ${error.message}`)
    }
  }

  const handleUpdateSeries = async (e) => {
    e.preventDefault()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão não encontrada')

      const response = await fetch(`https://cisoewbdzdxombthxqfi.supabase.co/functions/v1/update-serie`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serie_id: editingSeriesForm.id,
          name: editingSeriesForm.name,
          description: editingSeriesForm.description,
          duration_months: parseInt(editingSeriesForm.duration_months) || 12,
          interest_rate: parseFloat(editingSeriesForm.interest_rate) || 0,
          minimum_investment: parseFloat(editingSeriesForm.minimum_investment) || 0,
          max_commission_percentage: parseFloat(editingSeriesForm.max_commission_percentage) || 5.0
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Erro ao atualizar série')
      }

      console.log('✅ Série atualizada com sucesso!')
      setShowEditSeriesForm(false)
      setEditingSeriesForm({
        id: '',
        name: '',
        description: '',
        duration_months: '12',
        interest_rate: '0',
        minimum_investment: '0',
        max_commission_percentage: '5.0'
      })
      loadData()
    } catch (error) {
      console.error('❌ Erro ao atualizar série:', error)
      alert(`Erro ao atualizar série: ${error.message}`)
    }
  }

  const handleDelete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão não encontrada')

      const endpoint = deleteType === 'debenture' ? 'delete-debenture' : 'delete-serie'
      const idField = deleteType === 'debenture' ? 'debenture_id' : 'serie_id'

      const response = await fetch(`https://cisoewbdzdxombthxqfi.supabase.co/functions/v1/${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [idField]: deleteItem.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || `Erro ao excluir ${deleteType === 'debenture' ? 'debênture' : 'série'}`)
      }

      console.log(`✅ ${deleteType === 'debenture' ? 'Debênture' : 'Série'} excluída com sucesso!`)
      setShowDeleteConfirm(false)
      setDeleteItem(null)
      setDeleteType('')
      loadData()
    } catch (error) {
      console.error(`❌ Erro ao excluir ${deleteType}:`, error)
      alert(`Erro ao excluir ${deleteType === 'debenture' ? 'debênture' : 'série'}: ${error.message}`)
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
          {isGlobalUser() ? (
            <>
              <button
                onClick={() => setShowCreateDebentureForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Nova Debênture
              </button>
              <button
                onClick={() => {
                  if (!Array.isArray(debentures) || debentures.length === 0) {
                    alert('É necessário criar uma debênture antes de criar uma série.')
                    return
                  }
                  setShowCreateSeriesForm(true)
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Nova Série
              </button>
            </>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Apenas usuários Global podem criar/editar debêntures
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-start">
            <Building className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Total de Debêntures</p>
              <div className="mt-1">
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{Array.isArray(debentures) ? debentures.length : 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-start">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Debêntures Ativas</p>
              <div className="mt-1">
                <p className="text-xl lg:text-2xl font-bold text-green-700">
                  {Array.isArray(debentures) ? separateDebenturesByStatus(debentures).active.length : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-start">
            <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Debêntures Vencidas</p>
              <div className="mt-1">
                <p className="text-xl lg:text-2xl font-bold text-red-700">
                  {Array.isArray(debentures) ? separateDebenturesByStatus(debentures).expired.length : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-start">
            <Calendar className="w-8 h-8 text-purple-600 flex-shrink-0" />
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Valor Total Emitido</p>
              <div className="mt-1">
                <p className="text-lg lg:text-xl font-bold text-gray-900 break-words" title={formatCurrency(Array.isArray(debentures) ? 
                  debentures.reduce((sum, deb) => sum + (Number(deb?.total_emission_value) || 0), 0) : 0
                )}>
                  {formatCompactCurrency(Array.isArray(debentures) ? 
                    debentures.reduce((sum, deb) => sum + (Number(deb?.total_emission_value) || 0), 0) : 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-start">
            <TrendingUp className="w-8 h-8 text-orange-600 flex-shrink-0" />
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Valor Total Captado</p>
              <div className="mt-1">
                <p className="text-lg lg:text-xl font-bold text-gray-900 break-words" title={formatCurrency(Array.isArray(series) ? 
                  series.reduce((sum, serie) => sum + (Number(serie?.current_captation) || 0), 0) : 0
                )}>
                  {formatCompactCurrency(Array.isArray(series) ? 
                    series.reduce((sum, serie) => sum + (Number(serie?.current_captation) || 0), 0) : 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Criar Debênture */}
      {showCreateDebentureForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Nova Debênture</h2>
            
            <form onSubmit={handleCreateDebenture} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={debentureFormData.name}
                  onChange={(e) => setDebentureFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Emissor</label>
                <input
                  type="text"
                  value={debentureFormData.issuer_name}
                  onChange={(e) => setDebentureFormData(prev => ({ ...prev, issuer_name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Valor Total de Emissão</label>
                <input
                  type="number"
                  step="0.01"
                  value={debentureFormData.total_emission_value}
                  onChange={(e) => setDebentureFormData(prev => ({ ...prev, total_emission_value: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Data de Emissão</label>
                <input
                  type="date"
                  value={debentureFormData.emission_date}
                  onChange={(e) => setDebentureFormData(prev => ({ ...prev, emission_date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Data de Vencimento</label>
                <input
                  type="date"
                  value={debentureFormData.maturity_date}
                  onChange={(e) => setDebentureFormData(prev => ({ ...prev, maturity_date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  value={debentureFormData.description}
                  onChange={(e) => setDebentureFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Criar Debênture
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateDebentureForm(false)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Série */}
      {showCreateSeriesForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Nova Série</h2>
            
            <form onSubmit={handleCreateSeries} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Debênture</label>
                <select
                  value={seriesFormData.debenture_id}
                  onChange={(e) => setSeriesFormData(prev => ({ ...prev, debenture_id: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Selecione uma debênture...</option>
                  {debentures.map((debenture) => (
                    <option key={debenture.id} value={debenture.id}>
                      {debenture.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Código da Série</label>
                <input
                  type="text"
                  value={seriesFormData.series_code}
                  onChange={(e) => setSeriesFormData(prev => ({ ...prev, series_code: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={seriesFormData.name}
                  onChange={(e) => setSeriesFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Investimento Mínimo</label>
                <input
                  type="number"
                  step="0.01"
                  value={seriesFormData.minimum_investment}
                  onChange={(e) => setSeriesFormData(prev => ({ ...prev, minimum_investment: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Taxa de Juros (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={seriesFormData.interest_rate}
                  onChange={(e) => setSeriesFormData(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Comissão Total (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={seriesFormData.max_commission_percentage}
                  onChange={(e) => setSeriesFormData(prev => ({ ...prev, max_commission_percentage: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Prazo (meses)</label>
                <input
                  type="number"
                  value={seriesFormData.duration_months}
                  onChange={(e) => setSeriesFormData(prev => ({ ...prev, duration_months: parseInt(e.target.value) || 12 }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  value={seriesFormData.description}
                  onChange={(e) => setSeriesFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                >
                  Criar Série
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateSeriesForm(false)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Debênture */}
      {showEditDebentureForm && editingDebenture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Editar Debênture</h2>
            
            <form onSubmit={handleUpdateDebenture} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={editingDebenture.name}
                  onChange={(e) => setEditingDebenture(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  value={editingDebenture.description}
                  onChange={(e) => setEditingDebenture(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-700">Data de Vencimento</label>
                <input
                  type="date"
                  value={editingDebenture.maturity_date}
                  onChange={(e) => setEditingDebenture(prev => ({ ...prev, maturity_date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Atualizar Debênture
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditDebentureForm(false)
                    setEditingDebenture(null)
                  }}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Série */}
      {showEditSeriesForm && editingSeriesForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Editar Série</h2>
            
            <form onSubmit={handleUpdateSeries} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={editingSeriesForm.name}
                  onChange={(e) => setEditingSeriesForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  value={editingSeriesForm.description}
                  onChange={(e) => setEditingSeriesForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Investimento Mínimo</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingSeriesForm.minimum_investment}
                  onChange={(e) => setEditingSeriesForm(prev => ({ ...prev, minimum_investment: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Taxa de Juros (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingSeriesForm.interest_rate}
                  onChange={(e) => setEditingSeriesForm(prev => ({ ...prev, interest_rate: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Comissão Total (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingSeriesForm.max_commission_percentage}
                  onChange={(e) => setEditingSeriesForm(prev => ({ ...prev, max_commission_percentage: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Prazo (meses)</label>
                <input
                  type="number"
                  min="1"
                  value={editingSeriesForm.duration_months}
                  onChange={(e) => setEditingSeriesForm(prev => ({ ...prev, duration_months: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                >
                  Atualizar Série
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSeriesForm(false)
                    setEditingSeriesForm({
        id: '',
        name: '',
        description: '',
        duration_months: '12',
        interest_rate: '0',
        minimum_investment: '0',
        max_commission_percentage: '5.0'
      })
                  }}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {showDeleteConfirm && deleteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir {deleteType === 'debenture' ? 'esta debênture' : 'esta série'}?
              <span className="block font-semibold mt-2 text-gray-900">
                {deleteItem.name || 'Sem nome'}
              </span>
            </p>

            {deleteType === 'debenture' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-700">
                  <strong>Atenção:</strong> Certifique-se de que não há séries vinculadas a esta debênture.
                </p>
              </div>
            )}

            {deleteType === 'serie' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-700">
                  <strong>Atenção:</strong> Certifique-se de que não há investimentos vinculados a esta série.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Sim, Excluir
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteItem(null)
                  setDeleteType('')
                }}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Debêntures com Séries Agrupadas */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Debêntures e Séries</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Carregando debêntures...</p>
              </div>
            ) : Array.isArray(debentures) && debentures.length > 0 ? (
              <div className="space-y-6">
                {debentures.map((debenture) => {
                  if (!debenture || !debenture.id) return null
                  
                  const debenturesSeries = Array.isArray(series) ? 
                    series.filter(serie => serie && serie.debenture_id === debenture.id) : []
                  
                  const totalCaptado = debenturesSeries.reduce((sum, serie) => {
                    const captation = serie && serie.current_captation ? Number(serie.current_captation) : 0
                    return sum + captation
                  }, 0)
                  
                  const emissionValue = debenture.total_emission_value ? Number(debenture.total_emission_value) : 0
                  const percentualCaptacao = emissionValue > 0 ? 
                    (totalCaptado / emissionValue) * 100 : 0
                  
                  return (
                    <div key={debenture.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header da Debênture */}
                      <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-blue-900">{debenture.name || 'Sem nome'}</h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDebentureStatus(debenture.maturity_date).className}`}>
                                {getDebentureStatus(debenture.maturity_date).status === 'active' ? (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                ) : (
                                  <XCircle className="w-3 h-3 mr-1" />
                                )}
                                {getDebentureStatus(debenture.maturity_date).label}
                              </span>
                            </div>
                            <p className="text-sm text-blue-700 mt-1">
                              <span className="font-medium">Emissor:</span> {debenture.issuer_name || 'Não informado'}
                            </p>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <p className="text-sm text-blue-700">
                                <span className="font-medium">Data de Emissão:</span> {formatDate(debenture.emission_date)}
                              </p>
                              <p className="text-sm text-blue-700">
                                <span className="font-medium">Data de Vencimento:</span> {formatDate(debenture.maturity_date)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {/* Botões de ação para debêntures */}
                            {isGlobalUser() && (
                              <div className="flex gap-2 mb-4">
                                <button
                                  onClick={() => handleEditDebenture(debenture)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                  title="Editar debênture"
                                >
                                  <Edit className="w-4 h-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteConfirm(debenture, 'debenture')}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                  title="Excluir debênture"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Excluir
                                </button>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-blue-600 font-medium">VALOR EMITIDO</p>
                                <p className="text-lg font-bold text-blue-900">
                                  {formatCurrency(emissionValue)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-green-600 font-medium">VALOR CAPTADO</p>
                                <p className="text-lg font-bold text-green-700">
                                  {formatCurrency(totalCaptado)}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {percentualCaptacao.toFixed(1)}% captado
                                </p>
                              </div>
                            </div>
                            {/* Barra de progresso */}
                            <div className="mt-2 w-48">
                              <div className="bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(percentualCaptacao, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Séries da Debênture */}
                      <div className="px-6 py-4">
                        {debenturesSeries.length > 0 ? (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                              Séries desta Debênture ({debenturesSeries.length})
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Código
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Nome
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Investimento Mínimo
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Taxa de Juros
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Prazo
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Valor Captado
                                    </th>
                                    {isGlobalUser() && (
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                      </th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {debenturesSeries.map((serie, index) => {
                                    if (!serie || !serie.id) return null
                                    
                                    return (
                                      <tr key={serie.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {serie.series_code || 'N/A'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                          {serie.name || 'Sem nome'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                          {formatCurrency(serie.minimum_investment || 0)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {serie.interest_rate || 0}% a.a.
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                          {serie.duration_months || 0} meses
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-700">
                                          {formatCurrency(serie.current_captation || 0)}
                                        </td>
                                        {isGlobalUser() && (
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => handleEditSeries(serie)}
                                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                                title="Editar série"
                                              >
                                                <Edit className="w-3 h-3" />
                                                Editar
                                              </button>
                                              <button
                                                onClick={() => handleDeleteConfirm(serie, 'serie')}
                                                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                                title="Excluir série"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                                Excluir
                                              </button>
                                            </div>
                                          </td>
                                        )}
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">Nenhuma série criada para esta debênture.</p>
                            {isGlobalUser() && (
                              <button
                                onClick={() => {
                                  setSeriesFormData(prev => ({ ...prev, debenture_id: debenture.id }))
                                  setShowCreateSeriesForm(true)
                                }}
                                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                + Criar primeira série
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma debênture encontrada.</p>
                {isGlobalUser() && (
                  <button
                    onClick={() => setShowCreateDebentureForm(true)}
                    className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Criar primeira debênture
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DebentureManagement
