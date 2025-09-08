import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
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
  const profileCache = useRef<Map<string, { profile: User | null, timestamp: number }>>(new Map())
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  // Buscar perfil do usuário no sistema com cache e retry
  const fetchUserProfile = async (authUser: SupabaseUser, retryCount = 0): Promise<User | null> => {
    const cacheKey = authUser.id
    
    // Verificar cache primeiro
    const cached = profileCache.current.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('Perfil carregado do cache')
      return cached.profile
    }

    const maxRetries = 3
    const timeout = 15000 // 15 segundos
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const session = await supabase.auth.getSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile-simple`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      )
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Erro desconhecido' } }))
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }
      
      const data = await response.json()
      const profile = data.data
      
      // Armazenar no cache
      profileCache.current.set(cacheKey, {
        profile,
        timestamp: Date.now()
      })
      
      console.log('Perfil carregado com sucesso via edge function')
      return profile
      
    } catch (error) {
      console.error(`Tentativa ${retryCount + 1} falhou:`, error)
      
      // Implementar retry com backoff exponencial
      if (retryCount < maxRetries && !error.name?.includes('AbortError')) {
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.log(`Tentando novamente em ${delay}ms...`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchUserProfile(authUser, retryCount + 1)
      }
      
      // Se todas as tentativas falharam, tentar método fallback
      if (retryCount >= maxRetries) {
        console.warn('Todas as tentativas falharam, usando método fallback')
        return await fetchUserProfileFallback(authUser)
      }
      
      return null
    }
  }
  
  // Método fallback usando consultas diretas
  const fetchUserProfileFallback = async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      console.log('Executando busca de perfil fallback')
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      if (userError) {
        console.error('Erro no fallback - buscar usuário:', userError)
        return null
      }

      if (!userData) {
        console.warn(`Fallback - Usuário não encontrado: ${authUser.id}`)
        return null
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('id', userData.role_id)
        .maybeSingle()

      if (roleError) {
        console.warn('Fallback - Erro ao buscar papel:', roleError)
        // Retorna usuário sem role em caso de erro
        return {
          ...userData,
          user_roles: null
        } as User
      }

      const profile = {
        ...userData,
        user_roles: roleData
      } as User
      
      // Armazenar no cache
      profileCache.current.set(authUser.id, {
        profile,
        timestamp: Date.now()
      })
      
      console.log('Perfil carregado via fallback')
      return profile
      
    } catch (error) {
      console.error('Erro no método fallback:', error)
      return null
    }
  }

  const refreshUserProfile = async () => {
    if (user) {
      // Limpar cache para forçar nova busca
      profileCache.current.delete(user.id)
      const profile = await fetchUserProfile(user)
      setUserProfile(profile)
    }
  }
  
  // Função para limpar todo o cache
  const clearProfileCache = () => {
    profileCache.current.clear()
    console.log('Cache de perfis limpo')
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
          // Não bloquear interface enquanto busca perfil
          fetchUserProfile(session.user)
            .then(profile => {
              setUserProfile(profile)
              if (profile) {
                console.log('Perfil carregado após mudança de estado de auth')
              }
            })
            .catch(error => {
              console.error('Erro ao buscar perfil após login:', error)
              setUserProfile(null)
            })
        } else {
          setUserProfile(null)
          clearProfileCache() // Limpar cache ao fazer logout
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
      // Forçar limpeza do estado local
      setUser(null)
      setUserProfile(null)
      // Redirecionar para login
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