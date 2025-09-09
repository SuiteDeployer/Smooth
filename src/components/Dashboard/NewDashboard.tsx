import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { TrendingUp } from 'lucide-react'
import GlobalDashboard from './GlobalDashboard'
import MasterDashboard from './MasterDashboard'
import EscritorioDashboard from './EscritorioDashboard'
import AssessorDashboard from './AssessorDashboard'
import InvestorPortfolio from './InvestorPortfolio'

const NewDashboard = () => {
  const { userProfile } = useAuth()
  
  const userRole = userProfile?.user_roles?.role_name

  // Se for investidor, mostrar componente específico
  if (userRole === 'Investidor') {
    return <InvestorPortfolio />
  }

  // Se for Global, mostrar dashboard completo
  if (userRole === 'Global') {
    return <GlobalDashboard />
  }

  // Se for Master, mostrar dashboard de gestão de rede
  if (userRole === 'Master') {
    return <MasterDashboard />
  }

  // Se for Escritório, mostrar dashboard de gestão local
  if (userRole === 'Escritório') {
    return <EscritorioDashboard />
  }

  // Se for Assessor, mostrar dashboard de gestão de carteira
  if (userRole === 'Assessor') {
    return <AssessorDashboard />
  }

  // Fallback para outros perfis
  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="text-center py-12">
        <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">Funcionalidade em desenvolvimento</p>
        <p className="text-sm text-gray-500 mt-2">Perfil: {userRole}</p>
      </div>
    </div>
  )
}

export default NewDashboard
