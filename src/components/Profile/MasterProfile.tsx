import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMasterProfile } from '../../hooks/useUserProfile'
import { ArrowLeft, User, Users, TrendingUp, Mail, Badge, UserCheck, Building2, Crown } from 'lucide-react'

const MasterProfile = () => {
  const { id } = useParams<{ id: string }>()
  const { data: profileData, isLoading, error } = useMasterProfile(id!)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando perfil do master...</p>
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

  const { user, escritorios, assessors, investors, summary } = profileData

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
              <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Crown className="h-8 w-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{user.nome}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Crown className="h-4 w-4 text-purple-600" />
                  <span className="text-purple-600 font-medium">Master</span>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo da Rede Master</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Escritórios</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                {summary.total_escritorios}
              </p>
              <p className="text-xs text-blue-600">
                {summary.active_escritorios} ativos
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Assessores</span>
              </div>
              <p className="text-2xl font-bold text-green-900 mt-2">
                {summary.total_assessors}
              </p>
              <p className="text-xs text-green-600">
                {summary.active_assessors} ativos
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Investidores</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                {summary.total_investors}
              </p>
              <p className="text-xs text-purple-600">
                {summary.active_investors} ativos
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-3 space-y-6">
            {/* Escritórios */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Escritórios</h2>
              {escritorios && escritorios.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {escritorios.map((escritorio) => (
                    <div key={escritorio.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            <Link
                              to={`/perfil/escritorio/${escritorio.id}`}
                              className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {escritorio.nome}
                            </Link>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{escritorio.email}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Desde: {formatDate(escritorio.data_criacao)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            escritorio.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {escritorio.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhum escritório encontrado</p>
              )}
            </div>

            {/* Assessores */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessores</h2>
              {assessors && assessors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assessors.map((assessor) => (
                    <div key={assessor.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-green-600" />
                            <Link
                              to={`/perfil/assessor/${assessor.id}`}
                              className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {assessor.nome}
                            </Link>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{assessor.email}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Desde: {formatDate(assessor.data_criacao)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            assessor.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {assessor.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhum assessor encontrado</p>
              )}
            </div>

            {/* Investidores */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Investidores</h2>
              {investors && investors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {investors.map((investor) => (
                    <div key={investor.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-purple-600" />
                            <Link
                              to={`/perfil/investidor/${investor.id}`}
                              className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm"
                            >
                              {investor.nome.length > 15 ? `${investor.nome.substring(0, 15)}...` : investor.nome}
                            </Link>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{investor.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(investor.data_criacao)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            investor.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {investor.ativo ? 'A' : 'I'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhum investidor encontrado</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MasterProfile