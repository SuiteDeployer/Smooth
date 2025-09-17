import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { invokeEdgeFunctionWithRetry } from '../lib/apiClient'

export function useEnhancedUserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [networkUsers, setNetworkUsers] = useState([])
  const [investors, setInvestors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Buscar todos os usuários
  const fetchUsers = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          cpf_cnpj,
          phone,
          status,
          created_at,
          user_roles (
            role_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const allUsers = data || []
      setUsers(allUsers)
      
      // Filtrar usuários da rede
      const network = allUsers.filter((u: any) => 
        u.user_roles?.role_name !== 'Investidor' && (u.status === 'active' || u.status === 'ativo')
      )
      setNetworkUsers(network)
      
      // Filtrar investidores
      const investorsList = allUsers.filter((u: any) => 
        u.user_roles?.role_name === 'Investidor' && (u.status === 'active' || u.status === 'ativo')
      )
      setInvestors(investorsList)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Criar usuário usando Edge Function
  const createUser = async (userData: {
    email: string
    full_name: string
    role_name: string
    cpf_cnpj?: string
    phone?: string
    pix_key?: string
    pix_key_type?: string
    company_name?: string
    superior_user_id?: string
    commission_percentage?: number
  }) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoading(true)
      setError(null)
      
      console.log('🚀 Criando usuário via Edge Function:', userData)
      
      // Preparar dados para a Edge Function
      const edgeFunctionData = {
        email: userData.email,
        full_name: userData.full_name,
        role_name: userData.role_name,
        cpf_cnpj: userData.cpf_cnpj || '',
        phone: userData.phone || '',
        pix: userData.pix_key || '',
        pix_key_type: userData.pix_key_type || 'cpf_cnpj',
        company_name: userData.company_name || '',
        superior_user_id: userData.superior_user_id || ''
      }
      
      // Chamar Edge Function
      const result = await invokeEdgeFunctionWithRetry('create-user-v2', edgeFunctionData)
      
      console.log('✅ Usuário criado via Edge Function:', result)
      
      // Atualizar lista
      await fetchUsers()
      
      return {
        data: result.data,
        credentials: {
          email: userData.email,
          password: result.data?.temporaryPassword || 'Senha enviada por email'
        }
      }
    } catch (err: any) {
      console.error('❌ Erro na criação via Edge Function:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Atualizar usuário
  const updateUser = async (userId: string, updates: any) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()

      if (error) throw error
      
      // Atualizar lista
      fetchUsers()
      
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Deletar usuário
  const deleteUser = async (userId: string) => {
    if (!user) throw new Error('Usuário não autenticado')
    
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase
        .from('users')
        .update({ status: 'inactive' })
        .eq('id', userId)

      if (error) throw error
      
      // Atualizar lista
      fetchUsers()
      
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchUsers()
    }
  }, [user])

  return {
    users: { data: users, isLoading: loading, error },
    networkUsers: { data: networkUsers, isLoading: loading, error },
    investors: { data: investors, isLoading: loading, error },
    createUser: { mutateAsync: createUser, isLoading: loading },
    updateUser: { mutateAsync: updateUser, isLoading: loading },
    deleteUser: { mutateAsync: deleteUser, isLoading: loading },
    // Propriedades adicionais para compatibilidade
    availableRoles: { data: ['Investidor', 'Agente', 'Head', 'Escritório', 'Master', 'Global'] },
    getPossibleSuperiors: async () => networkUsers.filter(u => u.user_roles?.role_name !== 'Investidor'),
    createNetworkUser: { mutateAsync: createUser, isLoading: loading },
    createInvestor: { mutateAsync: createUser, isLoading: loading },
    refetch: fetchUsers
  }
}
