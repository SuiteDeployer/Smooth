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
      
      // Buscar usuário diretamente por ID (que deve corresponder ao auth user ID)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (userError) {
        console.error('Erro ao buscar usuário por ID:', userError)
        
        // Fallback: buscar por email
        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle()

        if (emailError) {
          console.error('Erro ao buscar usuário por email:', emailError)
          return null
        }

        if (!userByEmail) {
          console.warn('Usuário não encontrado na tabela users')
          return null
        }

        console.log('✅ Usuário encontrado por email:', userByEmail.name)
        
        // Map fields for compatibility
        const mappedUser = {
          ...userByEmail,
          full_name: userByEmail.name,
          cpf_cnpj: userByEmail.document,
          user_roles: {
            id: 'temp-id',
            role_name: userByEmail.user_type,
            hierarchy_level: 1
          }
        } as User
        
        return mappedUser
      }

      if (!userData) {
        console.warn('Usuário não encontrado na tabela users')
        return null
      }

      console.log('✅ Usuário encontrado por ID:', userData.name)
      
      // Map fields for compatibility
      const mappedUser = {
        ...userData,
        full_name: userData.name,
        cpf_cnpj: userData.document,
        user_roles: {
          id: 'temp-id',
          role_name: userData.user_type,
          hierarchy_level: 1
        }
      } as User
      
      return mappedUser
      
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error)
      return null
    }
  }

  const refreshUserProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user)
      setUserProfile(profile)
    }
  }

  // Carregar usuário na inicialização
  useEffect(() => {
    async function loadUser() {
      setLoading(true)
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)
        
        if (authUser) {
          const profile = await fetchUserProfile(authUser)
          setUserProfile(profile)
        } else {
          setUserProfile(null)
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error)
        setUser(null)
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    }
    loadUser()

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        setUser(session?.user || null)
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user)
          setUserProfile(profile)
        } else {
          setUserProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Métodos de autenticação
  async function signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email: string, password: string) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`
      }
    })
  }

  async function signOut() {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setUserProfile(null)
      window.location.href = '/login'
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

