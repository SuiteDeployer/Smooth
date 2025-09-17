import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGlobalProfile } from '../../hooks/useUserProfile'
import { ArrowLeft, User, Users, TrendingUp, Mail, Badge, UserCheck, Building2, Crown, Globe } from 'lucide-react'

const GlobalProfile = () => {
  const { id } = useParams<{ id: string }>()
  const { data: profileData, isLoading, error } = useGlobalProfile(id!)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando perfil global...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar perfil</h2>
            <p className="text-red-600 mb-4">
              {error || 'Não foi possível carregar os dados do perfil.'}
            </p>
            <Link
              to="/dashboard"
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Voltar ao Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Perfil não encontrado</p>
        </div>
      </div>
    )
  }

  const { user, masters, summary } = profileData

  // Importar a função de formatação centralizada
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Data inválida'
      return date.toLocaleDateString('pt-BR')
    } catch (error) {
      console.error('Erro ao formatar data:', error)
      return 'Erro na data'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Globe className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{user.nome}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Globe className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-600 font-medium">Global</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{user.email}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Membro desde</p>
                <p className="font-medium text-gray-900">{formatDate(user.data_criacao)}</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo da Plataforma</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Masters</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                {summary.total_masters}
              </p>
              <p className="text-xs text-purple-600">
                {summary.active_masters} ativos
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Escritórios</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                {summary.total_escritorios}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Heades</span>
              </div>
              <p className="text-2xl font-bold text-green-900 mt-2">
                {summary.total_heads}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Investidores</span>
              </div>
              <p className="text-2xl font-bold text-orange-900 mt-2">
                {summary.total_investors}
              </p>
            </div>
          </div>
        </div>

        {/* Masters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Masters</h2>
          {masters && masters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {masters.map((master) => (
                <div key={master.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Crown className="h-4 w-4 text-purple-600" />
                        <Link
                          to={`/perfil/master/${master.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {master.nome}
                        </Link>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{master.email}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Membro desde: {formatDate(master.data_criacao)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        master.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {master.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum master encontrado</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default GlobalProfile