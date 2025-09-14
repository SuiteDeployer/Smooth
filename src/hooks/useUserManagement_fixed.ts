import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface CreateUserData {
  email: string
  name: string
  user_type: string
  cpf?: string
  phone?: string
  pix?: string
  status?: string
  parent_id?: string
}

interface User {
  id: string
  name: string
  email: string
  cpf?: string
  phone?: string
  pix?: string
  status: string
  user_type: string
  parent_id?: string
  created_at: string
  updated_at: string
  can_edit?: boolean
  can_delete?: boolean
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
        console.error('❌ Erro na query de usuários:', error)
        throw error
      }
      
      console.log('✅ Usuários carregados:', data?.length || 0)
      console.log('📊 Dados dos usuários:', data)
      
      // Mapear dados para o formato esperado
      const mappedUsers = (data || []).map((userData: any) => ({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        cpf: userData.cpf,
        phone: userData.phone,
        pix: userData.pix,
        status: userData.status,
        user_type: userData.user_type,
        parent_id: userData.parent_id,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        can_edit: true, // RLS já filtra o que pode ser visto
        can_delete: true // RLS já filtra o que pode ser visto
      }))
      
      setUsers(mappedUsers)
    } catch (err: any) {
      console.error('❌ Erro ao buscar usuários:', err)
      setErrorState('fetchUsers', err.message)
    } finally {
      setLoadingState('fetchUsers', false)
    }
  }

  // Criar usuário
  const createUser = async (userData: CreateUserData) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoadingState('createUser', true)
      setErrorState('createUser', null)
      
      console.log('➕ Criando usuário:', userData)
      
      // Primeiro criar o usuário no auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: 'admin123', // Senha padrão
        email_confirm: true
      })
      
      if (authError) {
        console.error('❌ Erro ao criar usuário no auth:', authError)
        throw authError
      }
      
      console.log('✅ Usuário criado no auth:', authData.user?.id)
      
      // Depois criar o registro na tabela users
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: authData.user!.id,
          name: userData.name,
          email: userData.email,
          user_type: userData.user_type,
          cpf: userData.cpf,
          phone: userData.phone,
          pix: userData.pix,
          status: userData.status || 'Ativo',
          parent_id: userData.parent_id
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ Erro ao criar usuário na tabela:', error)
        // Se falhar, tentar deletar do auth
        await supabase.auth.admin.deleteUser(authData.user!.id)
        throw error
      }
      
      console.log('✅ Usuário criado com sucesso:', data)
      
      // Atualizar lista
      await fetchUsers()
      
      return data
    } catch (err: any) {
      console.error('❌ Erro ao criar usuário:', err)
      setErrorState('createUser', err.message)
      throw err
    } finally {
      setLoadingState('createUser', false)
    }
  }

  // Atualizar usuário
  const updateUser = async (userId: string, updates: Partial<CreateUserData>) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoadingState('updateUser', true)
      setErrorState('updateUser', null)
      
      console.log('🔄 Atualizando usuário:', userId, updates)
      
      const { data, error } = await supabase
        .from('users')
        .update({
          name: updates.name,
          email: updates.email,
          user_type: updates.user_type,
          cpf: updates.cpf,
          phone: updates.phone,
          pix: updates.pix,
          status: updates.status,
          parent_id: updates.parent_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Erro ao atualizar usuário:', error)
        throw error
      }
      
      console.log('✅ Usuário atualizado com sucesso:', data)
      
      // Atualizar lista
      await fetchUsers()
      
      return data
    } catch (err: any) {
      console.error('❌ Erro ao atualizar usuário:', err)
      setErrorState('updateUser', err.message)
      throw err
    } finally {
      setLoadingState('updateUser', false)
    }
  }

  // Deletar usuário
  const deleteUser = async (userId: string) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoadingState('deleteUser', true)
      setErrorState('deleteUser', null)
      
      console.log('🗑️ Deletando usuário:', userId)
      
      // Deletar da tabela users (RLS vai verificar permissões)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
      
      if (error) {
        console.error('❌ Erro ao deletar usuário:', error)
        throw error
      }
      
      // Deletar do auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      if (authError) {
        console.warn('⚠️ Erro ao deletar do auth (pode já ter sido deletado):', authError)
      }
      
      console.log('✅ Usuário deletado com sucesso')
      
      // Atualizar lista
      await fetchUsers()
    } catch (err: any) {
      console.error('❌ Erro ao deletar usuário:', err)
      setErrorState('deleteUser', err.message)
      throw err
    } finally {
      setLoadingState('deleteUser', false)
    }
  }

  // Carregar usuários quando o componente monta
  useEffect(() => {
    if (user) {
      fetchUsers()
    }
  }, [user])

  return {
    users,
    loadingStates,
    errorStates,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    // Compatibilidade com código antigo
    subordinatesData: users,
    availableRoles: [
      { id: '1', role_name: 'Global', hierarchy_level: 1 },
      { id: '2', role_name: 'Master', hierarchy_level: 2 },
      { id: '3', role_name: 'Escritório', hierarchy_level: 3 },
      { id: '4', role_name: 'Assessor', hierarchy_level: 4 },
      { id: '5', role_name: 'Investidor', hierarchy_level: 5 }
    ]
  }
}

