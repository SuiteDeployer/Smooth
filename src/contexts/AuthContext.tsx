import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '../lib/supabase'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Buscar perfil do usuário no sistema
  const fetchUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      console.log('🔍 Buscando perfil do usuário:', authUser.email)
      
      // Adicionar timeout para evitar travamento
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na busca do perfil')), 10000)
      )
      
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      const { data: userData, error: userError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any

      if (userError) {
        console.error('❌ Erro ao buscar usuário:', userError.message)
        
        // Se não encontrar por ID, tentar por email como fallback
        console.log('🔄 Tentando buscar por email...')
        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single()
          
        if (emailError) {
          console.error('❌ Erro ao buscar por email:', emailError.message)
          return null
        }
        
        console.log('✅ Perfil encontrado por email:', userByEmail.name)
        return userByEmail
      }

      console.log('✅ Perfil encontrado por ID:', userData.name)
      return userData
    } catch (error: any) {
      console.error('❌ Erro ao buscar perfil:', error.message)
      
      // Em caso de erro, retornar um perfil básico para não travar
      console.log('🔄 Criando perfil básico temporário...')
      return {
        id: authUser.id,
        email: authUser.email || '',
        name: 'Usuário',
        user_type: 'Global',
        parent_id: null,
        phone: null,
        document: null,
        cpf: null,
        pix: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null
      } as User
    }
  }

  // Atualizar perfil do usuário
  const refreshUserProfile = async () => {
    if (user) {
      console.log('🔄 Atualizando perfil do usuário...')
      const profile = await fetchUserProfile(user)
      setUserProfile(profile)
    }
  }

  // Carregar usuário na inicialização
  useEffect(() => {
    let mounted = true

    async function loadUser() {
      console.log('🚀 Carregando usuário inicial...')
      
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        console.log('👤 Usuário auth:', authUser?.email || 'Nenhum')
        
        if (!mounted) return
        
        setUser(authUser)
        
        if (authUser) {
          const profile = await fetchUserProfile(authUser)
          if (mounted) {
            setUserProfile(profile)
          }
        } else {
          if (mounted) {
            setUserProfile(null)
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar usuário:', error)
        if (mounted) {
          setUser(null)
          setUserProfile(null)
        }
      } finally {
        if (mounted) {
          console.log('✅ Loading finalizado')
          setLoading(false)
        }
      }
    }

    loadUser()

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email || 'Nenhum')
        
        if (!mounted) return
        
        setUser(session?.user || null)
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user)
          if (mounted) {
            setUserProfile(profile)
          }
        } else {
          if (mounted) {
            setUserProfile(null)
          }
        }
        
        if (mounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Métodos de autenticação
  async function signIn(email: string, password: string) {
    console.log('🔐 Tentando fazer login com:', email)
    setLoading(true)
    
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      console.log('🔐 Resultado do login:', result.error ? 'Erro' : 'Sucesso')
      
      if (result.error) {
        console.error('❌ Erro no login:', result.error.message)
      }
      
      return result
    } catch (error) {
      console.error('❌ Exceção no login:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email: string, password: string) {
    setLoading(true)
    try {
      const result = await supabase.auth.signUp({ email, password })
      return result
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    console.log('🚪 Fazendo logout...')
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

