import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const SUPABASE_URL = 'https://cisoewbdzdxombthxqfi.supabase.co'

export interface ProfileUser {
  id: string
  nome: string
  email: string
  nivel: string
  data_criacao: string
  ativo: boolean
}

export interface ProfileHierarchy {
  assessor?: ProfileUser
  escritorio?: ProfileUser
  master?: ProfileUser
  global?: ProfileUser
}

export interface InvestorProfileData {
  user: ProfileUser
  hierarchy: ProfileHierarchy
  investments: any[]
  summary: {
    total_invested: number
    total_investments: number
    first_investment?: string
  }
}

export interface AssessorProfileData {
  user: ProfileUser
  hierarchy: ProfileHierarchy
  investors: ProfileUser[]
  summary: {
    total_investors: number
    active_investors: number
  }
}

export interface EscritorioProfileData {
  user: ProfileUser
  hierarchy: ProfileHierarchy
  assessors: ProfileUser[]
  investors: ProfileUser[]
  summary: {
    total_assessors: number
    active_assessors: number
    total_investors: number
    active_investors: number
  }
}

export interface MasterProfileData {
  user: ProfileUser
  hierarchy: {}
  escritorios: ProfileUser[]
  assessors: ProfileUser[]
  investors: ProfileUser[]
  summary: {
    total_escritorios: number
    active_escritorios: number
    total_assessors: number
    active_assessors: number
    total_investors: number
    active_investors: number
  }
}

export interface GlobalProfileData {
  user: ProfileUser
  hierarchy: {}
  masters: ProfileUser[]
  summary: {
    total_masters: number
    active_masters: number
    total_escritorios: number
    total_assessors: number
    total_investors: number
  }
}

export type ProfileAction = 
  | 'get_investor_profile'
  | 'get_assessor_profile'
  | 'get_escritorio_profile'
  | 'get_master_profile'
  | 'get_global_profile'

interface UseProfileReturn {
  data: any
  isLoading: boolean
  error: string | null
}

export function useUserProfile(userId: string, action: ProfileAction): UseProfileReturn {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getAuthToken = async () => {
    const session = await supabase.auth.getSession()
    return session.data.session?.access_token
  }

  const fetchProfileData = async () => {
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Usuário não autenticado')

      setIsLoading(true)
      setError(null)

      const url = `${SUPABASE_URL}/functions/v1/user-profile-data?action=${action}&user_id=${userId}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Erro ao buscar dados do perfil')
      }

      const responseData = await response.json()
      setData(responseData.data)
    } catch (err: any) {
      console.error('Erro no perfil:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user && userId && action) {
      fetchProfileData()
    }
  }, [user, userId, action])

  return { data, isLoading, error }
}

// Hook específico para cada tipo de perfil
export const useInvestorProfile = (userId: string): UseProfileReturn => 
  useUserProfile(userId, 'get_investor_profile')

export const useAssessorProfile = (userId: string): UseProfileReturn => 
  useUserProfile(userId, 'get_assessor_profile')

export const useEscritorioProfile = (userId: string): UseProfileReturn => 
  useUserProfile(userId, 'get_escritorio_profile')

export const useMasterProfile = (userId: string): UseProfileReturn => 
  useUserProfile(userId, 'get_master_profile')

export const useGlobalProfile = (userId: string): UseProfileReturn => 
  useUserProfile(userId, 'get_global_profile')