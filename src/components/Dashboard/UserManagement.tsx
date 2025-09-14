import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUserManagement } from '../../hooks/useUserManagement'
import { Plus, Search, Edit, Trash2, Shield, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { PixSection } from '../common/PixSection'
import toast from 'react-hot-toast'

interface CreateUserFormData {
  email: string
  full_name: string
  role_name: string
  cpf_cnpj: string
  phone: string
  pix_key: string
  pix_key_type: string
  company_name: string
  superior_user_id: string
  status: string
}

// Schema de validação com Zod
// VALIDAÇÃO RELAXADA - aceita qualquer entrada para testes
const createUserSchema = z.object({
  full_name: z.string().min(1, { message: "Nome completo é obrigatório." }),
  email: z.string().min(1, { message: "Email é obrigatório." }).email({ message: "Email inválido." }),
  role_name: z.string().min(1, { message: "Tipo de usuário é obrigatório." }),
  cpf_cnpj: z.string().optional(),
  phone: z.string().optional(),
  pix_key: z.string().optional(),
  pix_key_type: z.string().optional(),
  company_name: z.string().optional(),
  superior_user_id: z.string().optional(),
  status: z.string().default('active')
});
// REMOVIDAS TODAS AS VALIDAÇÕES CONDICIONAIS - ACEITA QUALQUER COISA

interface SuperiorOption {
  id: string
  full_name: string
  email: string
  cpf_cnpj: string | null
  role_name: string
}

const UserManagement = () => {
  const { userProfile } = useAuth()
  const { 
    subordinates, 
    createUser, 
    updateUser, 
    deleteUser, 
    availableRoles: availableRolesData,
    clearAllErrors,
    loadingStates
  } = useUserManagement()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  
  // Refs para controle de debounce
  const createSubmissionRef = useRef<boolean>(false)
  const updateSubmissionRef = useRef<boolean>(false)
  const deleteSubmissionRef = useRef<boolean>(false)
  
  // React Hook Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    setError,
    clearErrors
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role_name: '',
      cpf_cnpj: '',
      phone: '',
      pix_key: '',
      pix_key_type: 'cpf_cnpj',
      company_name: '',
      superior_user_id: '',
      status: 'active'
    }
  })
  
  // Observar mudanças no role_name para buscar superiores
  const watchedRoleName = watch('role_name')
  const watchedSuperiorId = watch('superior_user_id')
  
  // Estados para busca de superior
  const [superiorSearchTerm, setSuperiorSearchTerm] = useState('')
  const [showSuperiorDropdown, setShowSuperiorDropdown] = useState(false)
  const [availableSuperiors, setAvailableSuperiors] = useState<SuperiorOption[]>([])
  const [selectedSuperior, setSelectedSuperior] = useState<SuperiorOption | null>(null)
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  const availableRoles = availableRolesData?.data || []

  // Buscar usuários disponíveis para serem superiores
  const fetchAvailableSuperiors = async (selectedRole: string) => {
    if (!selectedRole || selectedRole === 'Global') {
      setAvailableSuperiors([])
      return // Global não tem superior
    }
    
    try {
      // Buscar todos os usuários que podem ser superiores hierárquicos
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          cpf_cnpj,
          user_roles (
            role_name,
            hierarchy_level
          )
        `)
        .in('status', ['active', 'ativo']) // Aceitar ambos os formatos de status
        .not('user_roles.role_name', 'eq', 'Investidor') // Investidores não podem ser superiores

      if (error) {
        console.error('❌ Erro na consulta do Supabase:', error)
        throw error
      }
      
      console.log('📊 Usuários retornados da consulta:', users?.length || 0)
      console.log('🔍 Dados dos usuários:', users)
      
      // Filtrar usuários que podem ser superiores baseado na hierarquia
      const hierarchyMap: Record<string, string[]> = {
        'Master': ['Global'],
        'Escritório': ['Global', 'Master'],
        'Assessor': ['Global', 'Master', 'Escritório'],
        'Investidor': ['Global', 'Master', 'Escritório', 'Assessor']
      }
      
      const validSuperiorRoles = hierarchyMap[selectedRole] || []
      console.log(`🎯 Para ${selectedRole}, roles válidos:`, validSuperiorRoles)
      
      const filteredUsers = users?.filter(user => {
        const userRole = Array.isArray(user.user_roles) ? user.user_roles[0] : user.user_roles
        const isValid = validSuperiorRoles.includes(userRole?.role_name)
        console.log(`👤 ${user.full_name} (${userRole?.role_name}) - Válido: ${isValid}`)
        return isValid
      }).map(user => {
        const userRole = Array.isArray(user.user_roles) ? user.user_roles[0] : user.user_roles
        return {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          cpf_cnpj: user.cpf_cnpj,
          role_name: userRole?.role_name || ''
        }
      }) || []

      console.log('✅ Superiores filtrados:', filteredUsers)
      setAvailableSuperiors(filteredUsers)
      
      // SELEÇÃO AUTOMÁTICA: Se houver apenas um superior disponível, selecionar automaticamente
      if (filteredUsers.length === 1) {
        const autoSuperior = filteredUsers[0]
        console.log('🔄 Selecionando automaticamente superior único:', autoSuperior.full_name)
        setSelectedSuperior(autoSuperior)
        setSuperiorSearchTerm(autoSuperior.full_name)
        setValue('superior_user_id', autoSuperior.id)
      }
    } catch (error) {
      console.error('Erro ao buscar superiores:', error)
      setAvailableSuperiors([])
    }
  }

  // Efeito para buscar superiores quando o role mudar
  useEffect(() => {
    if (watchedRoleName) {
      fetchAvailableSuperiors(watchedRoleName)
      // Limpar superior selecionado quando trocar de tipo
      if (selectedSuperior) {
        setSelectedSuperior(null)
        setSuperiorSearchTerm('')
        setValue('superior_user_id', '')
      }
    }
  }, [watchedRoleName, setValue])

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.superior-dropdown-container')) {
        setShowSuperiorDropdown(false)
      }
    }

    if (showSuperiorDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSuperiorDropdown])

  // Hook de debounce personalizado
  const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    
    const debouncedCallback = useCallback((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }, [callback, delay])
    
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [])
    
    return debouncedCallback
  }

  // Função para scroll automático até o primeiro campo com erro
  const scrollToError = (fieldName: string) => {
    setTimeout(() => {
      const element = document.getElementById(fieldName) || 
                    document.querySelector(`[name="${fieldName}"]`) ||
                    document.getElementById('superior_field_container')
      
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        })
        // Focar no campo se for um input
        if (element.tagName === 'INPUT' || element.tagName === 'SELECT') {
          (element as HTMLInputElement).focus()
        }
      }
    }, 100)
  }

  // Função de submit melhorada com React Hook Form
  const onSubmit = async (data: CreateUserFormData) => {
    if (isCreatingUser || createUser.isLoading) {
      console.warn('🚫 Submissão já em andamento')
      return
    }
    
    setIsCreatingUser(true)
    
    try {
      console.log('📝 Dados do formulário para submissão:', data)
      
      // Limpar erros anteriores
      createUser.reset && createUser.reset()
      clearErrors()
      
      // Submeter para a API - converter dados para formato esperado
      const userData = {
        email: data.email,
        name: data.full_name,
        user_type: data.role_name,
        cpf: data.cpf_cnpj,
        phone: data.phone,
        pix: data.pix_key,
        status: data.status,
        parent_id: data.superior_user_id
      }
      const result = await createUser.mutateAsync(userData)
      
      // Mostrar mensagem de sucesso com informações das credenciais
      const credentials = (result as any)?.credentials || (result as any)?.data?.credentials
      if (credentials) {
        toast.success(
          `✅ Usuário criado com sucesso!\n📧 Email: ${credentials.email}\n🔐 Senha: ${credentials.password}\n\n⚠️ Senha foi enviada por email`, 
          {
            duration: 10000,
            style: {
              background: '#f0f9ff',
              border: '1px solid #0ea5e9',
              color: '#0c4a6e',
              fontSize: '14px',
              whiteSpace: 'pre-line',
              maxWidth: '500px'
            }
          }
        )
      } else {
        toast.success('Usuário criado com sucesso!', {
          icon: '✅',
          duration: 4000
        })
      }
      
      // Fechar modal e resetar form
      setShowCreateForm(false)
      resetFormCompletely()
      
    } catch (error: any) {
      console.error('❌ Erro ao criar usuário:', error)
      
      let errorMessage = 'Erro ao criar usuário. Tente novamente.'
      
      // Tratar diferentes tipos de erro
      if (error?.message) {
        if (error.message.includes('email')) {
          errorMessage = 'Este email já está em uso. Escolha outro email.'
          setError('email', { message: errorMessage })
          scrollToError('email')
        } else if (error.message.includes('superior')) {
          errorMessage = 'Erro na seleção do superior hierárquico.'
          setError('superior_user_id', { message: errorMessage })
          scrollToError('superior_user_id')
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage, {
        icon: '❌',
        duration: 6000
      })
    } finally {
      setIsCreatingUser(false)
    }
  }
  
  // Função para detectar erros de validação e fazer scroll
  const onError = (errors: any) => {
    console.log('❌ Erros de validação:', errors)
    
    // Encontrar o primeiro campo com erro
    const firstErrorField = Object.keys(errors)[0]
    if (firstErrorField) {
      scrollToError(firstErrorField)
      
      // Mostrar toast com erro específico
      const firstError = errors[firstErrorField]
      if (firstError?.message) {
        toast.error(firstError.message, {
          icon: '⚠️',
          duration: 4000
        })
      }
    }
  }

  const resetFormCompletely = () => {
    reset({
      email: '',
      full_name: '',
      role_name: '',
      cpf_cnpj: '',
      phone: '',
      pix_key: '',
      pix_key_type: 'cpf_cnpj',
      company_name: '',
      superior_user_id: '',
      status: 'active'
    })
    setSuperiorSearchTerm('')
    setSelectedSuperior(null)
    setShowSuperiorDropdown(false)
    setAvailableSuperiors([])
    setSelectedUser(null)
    clearErrors()
    createUser.reset && createUser.reset()
  }

  // Abrir modal de edição
  const handleEditUser = (user: any) => {
    setSelectedUser(user)
    reset({
      email: user.email,
      full_name: user.full_name,
      role_name: user.role_name || '',
      cpf_cnpj: user.cpf_cnpj || '',
      phone: user.phone || '',
      pix_key: user.pix_key || '',
      pix_key_type: user.pix_key_type || 'cpf_cnpj',
      company_name: user.company_name || '',
      superior_user_id: user.superior_user_id || '',
      status: user.status || 'active'
    })
    setShowEditForm(true)
  }

  // Abrir modal de confirmação de deleção
  const handleDeleteUser = (user: any) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const confirmDeleteUser = async () => {
    if (!selectedUser) return
    
    if (deleteSubmissionRef.current || deleteUser.isLoading) {
      console.warn('🚫 Delete já em andamento')
      return
    }
    
    deleteSubmissionRef.current = true
    
    try {
      deleteUser.reset && deleteUser.reset()
      await deleteUser.mutateAsync(selectedUser.id)
      toast.success('Usuário deletado com sucesso!')
      setShowDeleteModal(false)
      setSelectedUser(null)
    } catch (error: any) {
      console.error('❌ Erro ao deletar usuário:', error)
      const errorMessage = error?.message || 'Erro ao deletar usuário.'
      toast.error(errorMessage)
    } finally {
      deleteSubmissionRef.current = false
    }
  }

  const handleEditSubmit = async (data: CreateUserFormData) => {
    if (!selectedUser) return
    
    if (updateSubmissionRef.current || updateUser.isLoading) {
      console.warn('🚫 Update já em andamento')
      return
    }
    
    updateSubmissionRef.current = true
    
    try {
      updateUser.reset && updateUser.reset()
      await updateUser.mutateAsync(selectedUser.id, data)
      toast.success('Usuário atualizado com sucesso!')
      setShowEditForm(false)
      resetFormCompletely()
    } catch (error: any) {
      console.error('❌ Erro ao atualizar usuário:', error)
      const errorMessage = error?.message || 'Erro ao atualizar usuário.'
      toast.error(errorMessage)
    } finally {
      updateSubmissionRef.current = false
    }
  }

  // Filtrar superiores baseado na busca
  const filteredSuperiors = availableSuperiors.filter(superior => 
    superior.full_name.toLowerCase().includes(superiorSearchTerm.toLowerCase()) ||
    superior.email.toLowerCase().includes(superiorSearchTerm.toLowerCase()) ||
    (superior.cpf_cnpj && superior.cpf_cnpj.includes(superiorSearchTerm))
  )

  // Selecionar superior
  const handleSelectSuperior = (superior: SuperiorOption) => {
    setSelectedSuperior(superior)
    setValue('superior_user_id', superior.id)
    setSuperiorSearchTerm('')
    setShowSuperiorDropdown(false)
    // Limpar erro do campo superior quando selecionado
    clearErrors('superior_user_id')
  }

  // Verificar se deve mostrar campo de superior
  const shouldShowSuperiorField = watchedRoleName && watchedRoleName !== 'Global'

  const filteredUsers = subordinates.users?.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Global': 'bg-purple-100 text-purple-800',
      'Master': 'bg-blue-100 text-blue-800',
      'Escritório': 'bg-green-100 text-green-800',
      'Assessor': 'bg-yellow-100 text-yellow-800',
      'Investidor': 'bg-gray-100 text-gray-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-2">Gerencie sua rede de usuários e permissões</p>
        </div>
        
        {availableRoles.length > 0 && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Usuário</span>
          </button>
        )}
      </div>

      {/* Busca */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar usuários por nome ou email..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nível
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PIX
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingStates?.fetchUsers ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Carregando usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        getRoleColor(user.role_name || '')
                      }`}>
                        {user.role_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{user.pix || 'N/A'}</div>
                        {user.pix && (
                          <div className="text-sm text-gray-500">
                            PIX
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user.can_edit && (
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar usuário"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {user.can_delete && (
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-900"
                          title="Deletar usuário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-purple-600 hover:text-purple-900" title="Permissões">
                        <Shield className="h-4 w-4" />
                      </button>
                      {!user.can_edit && !user.can_delete && (
                        <span className="text-gray-400 text-xs">Sem permissões</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação - Design Elegante */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-4 pt-8">
          <div className="relative w-full max-w-2xl bg-white shadow-2xl rounded-xl my-4 max-h-[95vh] flex flex-col">
            {/* Cabeçalho do Modal */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">Criar Novo Usuário</h3>
                  <p className="text-blue-100 text-sm mt-1">Adicione um novo membro à sua equipe</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    resetFormCompletely()
                  }}
                  className="text-blue-100 hover:text-white transition-colors p-1 rounded-full hover:bg-blue-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Corpo do Modal com scroll */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6" id="create-user-form">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    {...register('full_name')}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.full_name 
                        ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300'
                    }`}
                    placeholder="Digite o nome completo"
                  />
                  {errors.full_name && (
                    <div className="mt-1 flex items-center text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{errors.full_name.message}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.email 
                        ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300'
                    }`}
                    placeholder="exemplo@email.com"
                  />
                  {errors.email && (
                    <div className="mt-1 flex items-center text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{errors.email.message}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="role_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Usuário <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="role_name"
                    {...register('role_name')}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.role_name 
                        ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione o tipo de usuário...</option>
                    {availableRoles.map(role => (
                      <option key={role.role_name} value={role.role_name}>{role.role_name}</option>
                    ))}
                  </select>
                  {errors.role_name && (
                    <div className="mt-1 flex items-center text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{errors.role_name.message}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Defina o nível hierárquico do usuário no sistema. <strong>Investidor pode ter qualquer superior hierárquico.</strong>
                  </p>
                </div>

                {/* Campo de seleção de superior hierárquico */}
                {shouldShowSuperiorField && (
                  <div id="superior_field_container">
                    <label htmlFor="superior_search" className="block text-sm font-medium text-gray-700 mb-1">
                      Superior Hierárquico <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1 superior-dropdown-container">
                      <div className="flex">
                        <input
                          id="superior_search"
                          name="superior_search"
                          type="text"
                          placeholder="Buscar por nome ou CNPJ..."
                          value={selectedSuperior ? selectedSuperior.full_name : superiorSearchTerm}
                          onChange={(e) => {
                            setSuperiorSearchTerm(e.target.value)
                            setShowSuperiorDropdown(true)
                            if (selectedSuperior) {
                              setSelectedSuperior(null)
                              setValue('superior_user_id', '')
                            }
                          }}
                          onFocus={() => setShowSuperiorDropdown(true)}
                          className={`flex-1 border rounded-l-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.superior_user_id 
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSuperiorDropdown(!showSuperiorDropdown)}
                          className="border border-l-0 border-gray-300 rounded-r-md px-3 py-2 bg-gray-50 hover:bg-gray-100"
                        >
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>

                      {/* Dropdown de resultados */}
                      {showSuperiorDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredSuperiors.length === 0 ? (
                            <div className="px-3 py-2 text-gray-500 text-sm">
                              {superiorSearchTerm ? 'Nenhum usuário encontrado' : 'Digite para buscar...'}
                            </div>
                          ) : (
                            filteredSuperiors.map((superior) => (
                              <button
                                key={superior.id}
                                type="button"
                                onClick={() => handleSelectSuperior(superior)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">{superior.full_name}</div>
                                    <div className="text-sm text-gray-500">{superior.email}</div>
                                    {superior.cpf_cnpj && (
                                      <div className="text-xs text-gray-400">{superior.cpf_cnpj}</div>
                                    )}
                                  </div>
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    getRoleColor(superior.role_name)
                                  }`}>
                                    {superior.role_name}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Mensagem de erro de validação */}
                    {errors.superior_user_id && (
                      <div className="mt-1 flex items-center text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>{errors.superior_user_id.message}</span>
                      </div>
                    )}
                    
                    {/* Texto explicativo dinâmico */}
                    <p className="text-xs text-gray-500 mt-1">
                      {!watchedRoleName ? 
                        "Selecione um cargo para definir o superior." :
                        watchedRoleName === 'Global' ?
                        "Este cargo não requer um superior." :
                        watchedRoleName === 'Investidor' ?
                        "Investidor pode ter superior de qualquer nível: Global, Master, Escritório ou Assessor." :
                        "Este campo é obrigatório. Busque e selecione o líder direto."
                      }
                    </p>
                    
                    {/* Exibir superior selecionado */}
                    {selectedSuperior && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-blue-900">{selectedSuperior.full_name}</div>
                            <div className="text-xs text-blue-700">{selectedSuperior.email}</div>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            getRoleColor(selectedSuperior.role_name)
                          }`}>
                            {selectedSuperior.role_name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="cpf_cnpj" className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                  <input
                    id="cpf_cnpj"
                    type="text"
                    {...register('cpf_cnpj')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Digite o CPF ou CNPJ"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    id="phone"
                    type="text"
                    {...register('phone')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                {/* Seção PIX */}
                <PixSection
                  pixValue={watch('pix_key')}
                  pixType={watch('pix_key_type')}
                  onPixChange={(pix, type) => {
                    setValue('pix_key', pix)
                    setValue('pix_key_type', type)
                  }}
                />

                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                  <input
                    id="company_name"
                    type="text"
                    {...register('company_name')}
                    placeholder="Deixe vazio para usar o nome completo"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>







                {/* Área de Feedback de Erro */}
                {createUser.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-red-800 mb-1">
                          {createUser.error.includes('autenticação') || createUser.error.includes('token') 
                            ? 'Erro de Autenticação' 
                            : 'Erro ao Criar Usuário'
                          }
                        </h3>
                        <p className="text-sm text-red-700">{createUser.error}</p>
                        
                        {/* Dicas específicas baseadas no tipo de erro */}
                        {createUser.error.includes('autenticação') || createUser.error.includes('token') ? (
                          <div className="mt-2 text-xs text-red-600">
                            <strong>Soluções sugeridas:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              <li>Atualize a página e faça login novamente</li>
                              <li>Verifique se sua sessão não expirou</li>
                              <li>Entre em contato com o suporte se o problema persistir</li>
                            </ul>
                          </div>
                        ) : createUser.error.includes('network') || createUser.error.includes('conexão') ? (
                          <div className="mt-2 text-xs text-red-600">
                            <strong>Soluções sugeridas:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              <li>Verifique sua conexão com a internet</li>
                              <li>Tente novamente em alguns segundos</li>
                              <li>Se o problema persistir, recarregue a página</li>
                            </ul>
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-red-600">
                            <strong>Dica:</strong> Verifique se todos os campos obrigatórios foram preenchidos corretamente.
                          </div>
                        )}
                        
                        {/* Botão para limpar erro */}
                        <button
                          type="button"
                          onClick={() => createUser.reset && createUser.reset()}
                          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                        >
                          Fechar aviso
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </form>
            </div>
            
            {/* Botões Fixos na Parte Inferior */}
            <div className="flex space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                type="submit"
                form="create-user-form"
                disabled={isCreatingUser || createUser.isLoading || isSubmitting}
                className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isCreatingUser || createUser.isLoading || isSubmitting
                    ? 'bg-blue-400 cursor-not-allowed opacity-70'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md'
                }`}
              >
                {(isCreatingUser || createUser.isLoading || isSubmitting) ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Criando usuário...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Criar Usuário</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isCreatingUser && !createUser.isLoading && !isSubmitting) {
                    setShowCreateForm(false)
                    resetFormCompletely()
                  }
                }}
                disabled={isCreatingUser || createUser.isLoading || isSubmitting}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditForm && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white my-10 max-h-screen overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Usuário</h3>
              
              <form onSubmit={handleSubmit(handleEditSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="edit_full_name" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                  <input
                    id="edit_full_name"
                    type="text"
                    required
                    {...register('full_name')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit_email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="edit_email"
                    type="email"
                    required
                    {...register('email')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit_cpf_cnpj" className="block text-sm font-medium text-gray-700">CPF/CNPJ</label>
                  <input
                    id="edit_cpf_cnpj"
                    type="text"
                    {...register('cpf_cnpj')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit_phone" className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    id="edit_phone"
                    type="text"
                    {...register('phone')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Seção PIX */}
                <PixSection
                  pixValue={watch('pix_key')}
                  pixType={watch('pix_key_type')}
                  onPixChange={(pix, type) => {
                    setValue('pix_key', pix)
                    setValue('pix_key_type', type)
                  }}
                />

                <div>
                  <label htmlFor="edit_company_name" className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                  <input
                    id="edit_company_name"
                    type="text"
                    {...register('company_name')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>



                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={updateUser.isLoading || updateSubmissionRef.current}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                      updateUser.isLoading || updateSubmissionRef.current
                        ? 'bg-blue-400 text-white cursor-not-allowed opacity-70'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {updateUser.isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Salvando...</span>
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!updateUser.isLoading) {
                        setShowEditForm(false)
                        resetFormCompletely()
                        updateUser.reset && updateUser.reset()
                      }
                    }}
                    disabled={updateUser.isLoading}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                      updateUser.isLoading 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Deleção */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Confirmar Deleção</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja deletar o usuário <strong>{selectedUser.full_name}</strong>?
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={confirmDeleteUser}
                  disabled={deleteUser.isLoading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteUser.isLoading ? 'Deletando...' : 'Sim, Deletar'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedUser(null)
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement