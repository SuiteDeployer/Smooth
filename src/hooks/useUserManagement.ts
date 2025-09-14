import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface CreateUserData {
  email: string
  name: string
  user_type: string
  cpf?: string
  phone?: string
  document?: string
  pix?: string
  status?: string
  parent_id?: string
}

interface Role {
  id: string
  role_name: string
  hierarchy_level: number
}

interface User {
  id: string
  name: string
  email: string
  cpf?: string
  phone?: string
  document?: string
  pix?: string
  status: string
  user_type: string
  parent_id?: string
  created_at: string
  updated_at: string
  created_by?: string
  can_edit?: boolean
  can_delete?: boolean
  // Compatibilidade com código antigo
  full_name?: string
  role_name?: string
}

interface LoadingStates {
  createUser: boolean
  updateUser: boolean
  deleteUser: boolean
  fetchUsers: boolean
}

interface ErrorStates {
  createUser: string | null
  updateUser: string | null
  deleteUser: string | null
  fetchUsers: string | null
}

export function useUserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    createUser: false,
    updateUser: false,
    deleteUser: false,
    fetchUsers: false
  })
  
  const [errorStates, setErrorStates] = useState<ErrorStates>({
    createUser: null,
    updateUser: null,
    deleteUser: null,
    fetchUsers: null
  })
  
  const setLoadingState = useCallback((operation: keyof LoadingStates, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [operation]: isLoading }))
  }, [])
  
  const setErrorState = useCallback((operation: keyof ErrorStates, error: string | null) => {
    setErrorStates(prev => ({ ...prev, [operation]: error }))
  }, [])

  // Buscar usuários baseado nas políticas RLS
  const fetchUsers = async () => {
    if (!user) return
    
    try {
      setLoadingState('fetchUsers', true)
      setErrorState('fetchUsers', null)
      
      console.log('🔍 Buscando usuários...')
      
      // Query simples - as políticas RLS vão filtrar automaticamente
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Erro ao buscar usuários:', error)
        setErrorState('fetchUsers', error.message)
        return
      }
      
      console.log('✅ Usuários encontrados:', data?.length || 0)
      setUsers(data || [])
      
    } catch (error: any) {
      console.error('❌ Erro inesperado ao buscar usuários:', error)
      setErrorState('fetchUsers', error.message)
    } finally {
      setLoadingState('fetchUsers', false)
    }
  }

  // Criar usuário
  const createUser = useCallback(async (userData: CreateUserData) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoadingState('createUser', true)
      setErrorState('createUser', null)
      
      console.log('📝 Criando usuário:', userData)
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...userData,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) {
        console.error('❌ Erro ao criar usuário:', error)
        setErrorState('createUser', error.message)
        throw error
      }
      
      console.log('✅ Usuário criado:', data)
      await fetchUsers() // Recarregar lista
      return data
      
    } catch (error: any) {
      console.error('❌ Erro inesperado ao criar usuário:', error)
      setErrorState('createUser', error.message)
      throw error
    } finally {
      setLoadingState('createUser', false)
    }
  }, [user, fetchUsers])

  // Atualizar usuário
  const updateUser = useCallback(async (userId: string, updateData: Partial<CreateUserData>) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoadingState('updateUser', true)
      setErrorState('updateUser', null)
      
      console.log('📝 Atualizando usuário:', userId, updateData)
      
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Erro ao atualizar usuário:', error)
        setErrorState('updateUser', error.message)
        throw error
      }
      
      console.log('✅ Usuário atualizado:', data)
      await fetchUsers() // Recarregar lista
      return data
      
    } catch (error: any) {
      console.error('❌ Erro inesperado ao atualizar usuário:', error)
      setErrorState('updateUser', error.message)
      throw error
    } finally {
      setLoadingState('updateUser', false)
    }
  }, [user, fetchUsers])

  // Deletar usuário
  const deleteUser = useCallback(async (userId: string) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoadingState('deleteUser', true)
      setErrorState('deleteUser', null)
      
      console.log('🗑️ Deletando usuário:', userId)
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
      
      if (error) {
        console.error('❌ Erro ao deletar usuário:', error)
        setErrorState('deleteUser', error.message)
        throw error
      }
      
      console.log('✅ Usuário deletado')
      await fetchUsers() // Recarregar lista
      
    } catch (error: any) {
      console.error('❌ Erro inesperado ao deletar usuário:', error)
      setErrorState('deleteUser', error.message)
      throw error
    } finally {
      setLoadingState('deleteUser', false)
    }
  }, [user, fetchUsers])

  // Limpar todos os erros
  const clearAllErrors = useCallback(() => {
    setErrorStates({
      createUser: null,
      updateUser: null,
      deleteUser: null,
      fetchUsers: null
    })
  }, [])

  // Carregar usuários na inicialização
  useEffect(() => {
    if (user) {
      fetchUsers()
    }
  }, [user])

  // Criar objetos de mutação compatíveis com React Query
  const createUserMutation = {
    mutateAsync: createUser,
    isLoading: loadingStates.createUser,
    error: errorStates.createUser,
    reset: () => setErrorState('createUser', null)
  }

  const updateUserMutation = {
    mutateAsync: updateUser,
    isLoading: loadingStates.updateUser,
    error: errorStates.updateUser,
    reset: () => setErrorState('updateUser', null)
  }

  const deleteUserMutation = {
    mutateAsync: deleteUser,
    isLoading: loadingStates.deleteUser,
    error: errorStates.deleteUser,
    reset: () => setErrorState('deleteUser', null)
  }

  return {
    // Dados principais
    users,
    subordinates: { users }, // Compatibilidade com código antigo
    
    // Estados de loading e erro
    loadingStates,
    errorStates,
    
    // Funções principais
    fetchUsers,
    createUser: createUserMutation,
    updateUser: updateUserMutation,
    deleteUser: deleteUserMutation,
    clearAllErrors,
    
    // Dados auxiliares
    availableRoles: {
      data: [
        { id: '1', role_name: 'Global', hierarchy_level: 1 },
        { id: '2', role_name: 'Master', hierarchy_level: 2 },
        { id: '3', role_name: 'Escritório', hierarchy_level: 3 },
        { id: '4', role_name: 'Assessor', hierarchy_level: 4 },
        { id: '5', role_name: 'Investidor', hierarchy_level: 5 }
      ]
    },
    
    // Compatibilidade com código antigo
    subordinatesData: users
  }
}

