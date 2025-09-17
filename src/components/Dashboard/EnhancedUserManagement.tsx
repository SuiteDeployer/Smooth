import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEnhancedUserManagement } from '../../hooks/useEnhancedUserManagement'
import { Users, UserPlus, Search, Edit, Trash2, Shield, Building, ChevronRight, Home, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

type ViewMode = 'overview' | 'network' | 'investors'
type ActionMode = 'create' | 'edit' | null

interface CreateNetworkUserData {
  email: string
  full_name: string
  role_name: string
  company_name: string
  cpf_cnpj: string
  phone: string
  commission_percentage: number
  superior_user_id: string
}

interface CreateInvestorData {
  email: string
  full_name: string
  cpf_cnpj: string
  phone: string
  investor_profile: string
}

const EnhancedUserManagement = () => {
  const { userProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    networkUsers,
    investors,
    availableRoles,
    getPossibleSuperiors,
    createNetworkUser,
    createInvestor,
    updateUser,
    deleteUser
  } = useEnhancedUserManagement()

  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [actionMode, setActionMode] = useState<ActionMode>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [possibleSuperiors, setPossibleSuperiors] = useState<any[]>([])
  const [superiorSearchTerm, setSuperiorSearchTerm] = useState('')
  const [showSuperiorDropdown, setShowSuperiorDropdown] = useState(false)
  const [filteredSuperiors, setFilteredSuperiors] = useState<any[]>([])
  
  const [networkFormData, setNetworkFormData] = useState<CreateNetworkUserData>({
    email: '',
    full_name: '',
    role_name: '',
    company_name: '',
    cpf_cnpj: '',
    phone: '',
    commission_percentage: 0,
    superior_user_id: ''
  })

  const [investorFormData, setInvestorFormData] = useState<CreateInvestorData>({
    email: '',
    full_name: '',
    cpf_cnpj: '',
    phone: '',
    investor_profile: 'conservador'
  })

  const canCreateNetworkUsers = availableRoles.data?.some((role: string) => role !== 'Investidor') || false
  const canCreateInvestors = availableRoles.data?.includes('Investidor') || false

  const handleRoleChange = async (roleName: string) => {
    if (roleName) {
      try {
        const superiors = await getPossibleSuperiors()
        setPossibleSuperiors(superiors)
        setFilteredSuperiors(superiors)
        setSuperiorSearchTerm('')
      } catch (error) {
        console.error('Erro ao buscar superiores possíveis:', error)
      }
    }
  }

  // Inicializar busca com parâmetro da URL
  useEffect(() => {
    const searchParam = searchParams.get('search')
    if (searchParam) {
      setSearchTerm(decodeURIComponent(searchParam))
    }
  }, [searchParams])

  // Filtrar superiores baseado na busca
  useEffect(() => {
    if (!superiorSearchTerm.trim()) {
      setFilteredSuperiors(possibleSuperiors)
    } else {
      const filtered = possibleSuperiors.filter(superior => 
        superior.full_name.toLowerCase().includes(superiorSearchTerm.toLowerCase()) ||
        (superior.cpf_cnpj && superior.cpf_cnpj.includes(superiorSearchTerm)) ||
        (superior.company_name && superior.company_name.toLowerCase().includes(superiorSearchTerm.toLowerCase()))
      )
      setFilteredSuperiors(filtered)
    }
  }, [superiorSearchTerm, possibleSuperiors])

  const handleNetworkUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (actionMode === 'create') {
        await createNetworkUser.mutateAsync(networkFormData)
      } else if (actionMode === 'edit' && selectedUser) {
        await updateUser.mutateAsync(selectedUser.id, networkFormData)
      }
      resetForms()
    } catch (error) {
      console.error('Erro ao salvar usuário da rede:', error)
    }
  }

  const handleInvestorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (actionMode === 'create') {
        await createInvestor.mutateAsync({
          ...investorFormData,
          role_name: 'Investidor'
        })
      } else if (actionMode === 'edit' && selectedUser) {
        await updateUser.mutateAsync(selectedUser.id, investorFormData)
      }
      resetForms()
    } catch (error) {
      console.error('Erro ao salvar investidor:', error)
    }
  }

  const handleEdit = (user: any) => {
    setSelectedUser(user)
    setActionMode('edit')
    
    if (user.user_type === 'network_user') {
      setNetworkFormData({
        email: user.email,
        full_name: user.full_name,
        role_name: user.role_name,
        company_name: user.company_name || '',
        cpf_cnpj: user.cpf_cnpj || '',
        phone: user.phone || '',
        commission_percentage: user.commission_percentage || 0,
        superior_user_id: user.superior_user_id || ''
      })
      handleRoleChange(user.role_name)
    } else {
      setInvestorFormData({
        email: user.email,
        full_name: user.full_name,
        cpf_cnpj: user.cpf_cnpj || '',
        phone: user.phone || '',
        investor_profile: user.investor_profile || 'conservador'
      })
    }
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (window.confirm(`Tem certeza que deseja deletar o usuário "${userName}"?`)) {
      try {
        await deleteUser.mutateAsync(userId)
      } catch (error) {
        console.error('Erro ao deletar usuário:', error)
        alert('Erro ao deletar usuário. Verifique se ele não possui subordinados.')
      }
    }
  }

  const resetForms = () => {
    setActionMode(null)
    setSelectedUser(null)
    setNetworkFormData({
      email: '',
      full_name: '',
      role_name: '',
      company_name: '',
      cpf_cnpj: '',
      phone: '',
      commission_percentage: 0,
      superior_user_id: ''
    })
    setInvestorFormData({
      email: '',
      full_name: '',
      cpf_cnpj: '',
      phone: '',
      investor_profile: 'conservador'
    })
    setPossibleSuperiors([])
    setSuperiorSearchTerm('')
    setShowSuperiorDropdown(false)
    setFilteredSuperiors([])
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Global': 'bg-purple-100 text-purple-800',
      'Master': 'bg-blue-100 text-blue-800',
      'Escritório': 'bg-green-100 text-green-800',
      'Head': 'bg-yellow-100 text-yellow-800',
      'Investidor': 'bg-gray-100 text-gray-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const filteredNetworkUsers = networkUsers.data?.filter((user: any) => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.company_name && user.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const filteredInvestors = investors.data?.filter((user: any) => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Breadcrumb component
  const Breadcrumb = () => (
    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      <Home className="h-4 w-4" />
      <span>Dashboard</span>
      <ChevronRight className="h-4 w-4" />
      <span>Gestão de Usuários</span>
      {viewMode !== 'overview' && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="text-blue-600">
            {viewMode === 'network' ? 'Gestão de Rede' : 'Gestão de Investidores'}
          </span>
        </>
      )}
    </div>
  )

  // Overview/Home Page
  if (viewMode === 'overview') {
    return (
      <div className="p-6 space-y-6">
        <Breadcrumb />
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600 mt-2">Sistema completo de gerenciamento de usuários e investidores</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gestão de Rede */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Gestão de Rede</h3>
                  <p className="text-sm text-gray-600">Masters, Escritórios e Heads</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total de usuários da rede:</span>
                <span className="font-semibold text-blue-600">{networkUsers.data?.length || 0}</span>
              </div>
              
              {canCreateNetworkUsers && (
                <button
                  onClick={() => setViewMode('network')}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Building className="h-4 w-4" />
                  <span>Gerenciar Rede</span>
                </button>
              )}
            </div>
          </div>

          {/* Gestão de Investidores */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Gestão de Investidores</h3>
                  <p className="text-sm text-gray-600">Clientes e carteiras de investimento</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total de investidores:</span>
                <span className="font-semibold text-green-600">{investors.data?.length || 0}</span>
              </div>
              
              {canCreateInvestors && (
                <button
                  onClick={() => setViewMode('investors')}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Gerenciar Investidores</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Geral</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{networkUsers.data?.length || 0}</div>
              <div className="text-sm text-gray-600">Usuários de Rede</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{investors.data?.length || 0}</div>
              <div className="text-sm text-gray-600">Investidores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{(networkUsers.data?.length || 0) + (investors.data?.length || 0)}</div>
              <div className="text-sm text-gray-600">Total Geral</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{availableRoles.data?.length || 0}</div>
              <div className="text-sm text-gray-600">Tipos Disponíveis</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode('overview')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Voltar ao Menu Principal
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('network')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'network'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building className="h-4 w-4 inline mr-2" />
              Gestão de Rede
            </button>
            <button
              onClick={() => setViewMode('investors')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'investors'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Gestão de Investidores
            </button>
          </div>
        </div>
      </div>

      {/* Current View Content */}
      <div className="space-y-6">
        {/* Header da Seção */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {viewMode === 'network' ? 'Gestão de Rede' : 'Gestão de Investidores'}
            </h1>
            <p className="text-gray-600 mt-2">
              {viewMode === 'network' 
                ? 'Gerencie Masters, Escritórios e Heads da sua rede' 
                : 'Gerencie investidores e suas carteiras'}
            </p>
          </div>
          
          {((viewMode === 'network' && canCreateNetworkUsers) || (viewMode === 'investors' && canCreateInvestors)) && (
            <button
              onClick={() => setActionMode('create')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-white transition-colors ${
                viewMode === 'network' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <UserPlus className="h-5 w-5" />
              <span>{viewMode === 'network' ? 'Novo Usuário da Rede' : 'Novo Investidor'}</span>
            </button>
          )}
        </div>

        {/* Busca */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={`Buscar ${viewMode === 'network' ? 'usuários da rede' : 'investidores'} por nome, email ou empresa...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  {viewMode === 'network' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nível/Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Superior
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Comissão
                      </th>
                    </>
                  )}
                  {viewMode === 'investors' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Perfil
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CPF
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(viewMode === 'network' ? networkUsers.isLoading : investors.isLoading) ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : (viewMode === 'network' ? filteredNetworkUsers : filteredInvestors).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Nenhum {viewMode === 'network' ? 'usuário da rede' : 'investidor'} encontrado
                    </td>
                  </tr>
                ) : (
                  (viewMode === 'network' ? filteredNetworkUsers : filteredInvestors).map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${
                              viewMode === 'network' ? 'bg-blue-500' : 'bg-green-500'
                            }`}>
                              {user.full_name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      {viewMode === 'network' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                getRoleColor(user.role_name || '')
                              }`}>
                                {user.role_name}
                              </span>
                              {user.company_name && (
                                <div className="text-xs text-gray-500 mt-1">{user.company_name}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.superior_name || 'Global'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.commission_percentage || 0}%
                          </td>
                        </>
                      )}
                      {viewMode === 'investors' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.investor_profile || 'Não definido'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.cpf_cnpj || '-'}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id, user.full_name)}
                          className="text-red-600 hover:text-red-900"
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="text-purple-600 hover:text-purple-900" title="Permissões">
                          <Shield className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Criação/Edição - Usuários de Rede */}
      {actionMode && viewMode === 'network' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {actionMode === 'create' ? 'Criar Novo Usuário da Rede' : 'Editar Usuário da Rede'}
              </h3>
              
              <form onSubmit={handleNetworkUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={networkFormData.full_name}
                    onChange={(e) => setNetworkFormData({ ...networkFormData, full_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={networkFormData.email}
                    onChange={(e) => setNetworkFormData({ ...networkFormData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome da Empresa *</label>
                  <input
                    type="text"
                    required
                    value={networkFormData.company_name}
                    onChange={(e) => setNetworkFormData({ ...networkFormData, company_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nome da empresa do usuário"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Usuário *</label>
                  <select
                    required
                    value={networkFormData.role_name}
                    onChange={(e) => {
                      setNetworkFormData({ ...networkFormData, role_name: e.target.value })
                      handleRoleChange(e.target.value)
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {availableRoles.data?.filter((role: string) => role !== 'Investidor').map((role: string) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {possibleSuperiors.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Superior Hierárquico</label>
                    <div className="relative">
                      <div className="mt-1 relative">
                        <input
                          type="text"
                          value={superiorSearchTerm || (networkFormData.superior_user_id ? possibleSuperiors.find(s => s.id === networkFormData.superior_user_id)?.full_name || '' : '')}
                          onChange={(e) => {
                            setSuperiorSearchTerm(e.target.value)
                            setShowSuperiorDropdown(true)
                            if (!e.target.value) {
                              setNetworkFormData({ ...networkFormData, superior_user_id: '' })
                            }
                          }}
                          onFocus={() => setShowSuperiorDropdown(true)}
                          placeholder="Buscar por nome, CPF/CNPJ ou empresa..."
                          className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSuperiorDropdown(!showSuperiorDropdown)}
                          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {showSuperiorDropdown && filteredSuperiors.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                          {filteredSuperiors.map((superior) => (
                            <div
                              key={superior.id || 'global'}
                              onClick={() => {
                                setNetworkFormData({ ...networkFormData, superior_user_id: superior.id || '' })
                                setSuperiorSearchTerm('')
                                setShowSuperiorDropdown(false)
                              }}
                              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium block truncate">
                                  {superior.full_name}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {superior.role_name} {superior.company_name && `• ${superior.company_name}`}
                                </span>
                                {superior.cpf_cnpj && (
                                  <span className="text-xs text-gray-400">
                                    {superior.cpf_cnpj}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {showSuperiorDropdown && filteredSuperiors.length === 0 && superiorSearchTerm && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-2 text-center text-gray-500">
                          Nenhum superior encontrado
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">CPF/CNPJ</label>
                  <input
                    type="text"
                    value={networkFormData.cpf_cnpj}
                    onChange={(e) => setNetworkFormData({ ...networkFormData, cpf_cnpj: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="text"
                    value={networkFormData.phone}
                    onChange={(e) => setNetworkFormData({ ...networkFormData, phone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Comissão (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={networkFormData.commission_percentage}
                    onChange={(e) => setNetworkFormData({ ...networkFormData, commission_percentage: Number(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={createNetworkUser.isLoading || updateUser.isLoading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {(createNetworkUser.isLoading || updateUser.isLoading) ? 'Salvando...' : 
                     (actionMode === 'create' ? 'Criar Usuário' : 'Atualizar Usuário')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForms}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição - Investidores */}
      {actionMode && viewMode === 'investors' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {actionMode === 'create' ? 'Criar Novo Investidor' : 'Editar Investidor'}
              </h3>
              
              <form onSubmit={handleInvestorSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={investorFormData.full_name}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, full_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={investorFormData.email}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">CPF</label>
                  <input
                    type="text"
                    value={investorFormData.cpf_cnpj}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, cpf_cnpj: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="text"
                    value={investorFormData.phone}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, phone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Perfil de Investimento</label>
                  <select
                    value={investorFormData.investor_profile}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, investor_profile: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="conservador">Conservador</option>
                    <option value="moderado">Moderado</option>
                    <option value="arrojado">Arrojado</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={createInvestor.isLoading || updateUser.isLoading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {(createInvestor.isLoading || updateUser.isLoading) ? 'Salvando...' : 
                     (actionMode === 'create' ? 'Criar Investidor' : 'Atualizar Investidor')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForms}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedUserManagement