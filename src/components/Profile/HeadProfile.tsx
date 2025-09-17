import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useHeadProfile } from '../../hooks/useUserProfile'
import { ArrowLeft, User, Users, TrendingUp, Mail, Badge, UserCheck } from 'lucide-react'

const HeadProfile = () => {
  const { id } = useParams<{ id: string }>()
  const { data: profileData, isLoading, error } = useHeadProfile(id!)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando perfil do head...</p>
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

  const { user, hierarchy, investors, summary } = profileData

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
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
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{user.nome}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">Head</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal - Investidores */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resumo */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo da Carteira</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Total de Investidores</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-2">
                    {summary.total_investors}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Investidores Ativos</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-2">
                    {summary.active_investors}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Investidores */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Investidores</h2>
              {investors && investors.length > 0 ? (
                <div className="space-y-4">
                  {investors.map((investor) => (
                    <div key={investor.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <Link
                              to={`/perfil/investidor/${investor.id}`}
                              className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {investor.nome}
                            </Link>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{investor.email}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Membro desde: {formatDate(investor.data_criacao)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            investor.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {investor.ativo ? 'Ativo' : 'Inativo'}
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

          {/* Sidebar - Hierarquia */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Hierarquia Superior</h2>
              <div className="space-y-4">
                {/* Escritório */}
                {hierarchy.escritorio && (
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Escritório</span>
                    </div>
                    <Link
                      to={`/perfil/escritorio/${hierarchy.escritorio.id}`}
                      className="block mt-1 font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {hierarchy.escritorio.nome}
                    </Link>
                    <p className="text-sm text-gray-600">{hierarchy.escritorio.email}</p>
                  </div>
                )}

                {/* Master */}
                {hierarchy.master && (
                  <div className="border-l-4 border-purple-500 pl-4">
                    <div className="flex items-center space-x-2">
                      <Badge className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-600">Master</span>
                    </div>
                    <Link
                      to={`/perfil/master/${hierarchy.master.id}`}
                      className="block mt-1 font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {hierarchy.master.nome}
                    </Link>
                    <p className="text-sm text-gray-600">{hierarchy.master.email}</p>
                  </div>
                )}

                {/* Global */}
                {hierarchy.global && (
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <div className="flex items-center space-x-2">
                      <Badge className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-600">Global</span>
                    </div>
                    <Link
                      to={`/perfil/global/${hierarchy.global.id}`}
                      className="block mt-1 font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {hierarchy.global.nome}
                    </Link>
                    <p className="text-sm text-gray-600">{hierarchy.global.email}</p>
                  </div>
                )}
              </div>
              
              {!hierarchy.escritorio && !hierarchy.master && !hierarchy.global && (
                <p className="text-gray-500 text-center py-4">Nenhuma hierarquia superior</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeadProfile