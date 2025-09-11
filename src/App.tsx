import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginForm from './components/Auth/LoginForm'
import ResetPassword from './components/Auth/ResetPassword'
import DashboardLayout from './components/Layout/DashboardLayout'
import GlobalDashboard from './components/Dashboard/GlobalDashboard'
import NewDashboard from './components/Dashboard/NewDashboard'
import UserManagementSimple from './components/UserManagementSimple'
import InvestmentDashboard from './components/Dashboard/InvestmentDashboard'
import InvestorPortfolio from './components/Dashboard/InvestorPortfolio'
import InvestorPerformance from './components/Dashboard/InvestorPerformance'
import InvestorInvestments from './components/Dashboard/InvestorInvestments'
import DebentureManagement from './components/Dashboard/DebentureManagement'
import AuditDashboard from './components/Dashboard/AuditDashboard'
import Settings from './components/Settings/Settings'
import EnhancedCommissions from './components/Commissions/EnhancedCommissions'
import CommissionsReformulated from './components/Commissions/CommissionsReformulated'

import InvestorProfile from './components/Profile/InvestorProfile'
import AssessorProfile from './components/Profile/AssessorProfile'
import EscritorioProfile from './components/Profile/EscritorioProfile'
import MasterProfile from './components/Profile/MasterProfile'
import GlobalProfile from './components/Profile/GlobalProfile'
import TestUserForm from './components/Dashboard/TestUserForm'
import CommissionsDashboard from './features/commissions/pages/CommissionsDashboard'
import RemuneracaoDashboard from './features/remuneracao/pages/RemuneracaoDashboard'
import ComissoesManus from './components/Manus/ComissoesManus'
import RemuneracaoManus from './components/Manus/RemuneracaoManus'
import './App.css'

// Componente para proteger rotas que precisam de autenticação
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Se o usuário está autenticado mas não tem perfil, mostrar erro
  if (user && !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Perfil não encontrado</h2>
            <p className="text-red-600 mb-4">
              Sua conta foi autenticada, mas não foi encontrado um perfil correspondente no sistema.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Componente para redirecionar para o dashboard apropriado
function DashboardRedirect() {
  const { userProfile } = useAuth()
  
  if (userProfile?.user_roles?.role_name === 'Investidor') {
    return <Navigate to="/portfolio" replace />
  }
  
  return <Navigate to="/dashboard" replace />
}

// Criar cliente do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
        <div className="App">
          {/* Configuração dos Toasts seguindo o guia de design */}
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            containerClassName=""
            containerStyle={{}}
            toastOptions={{
              // Configuração padrão para todos os toasts
              duration: 5000,
              style: {
                background: '#FFFFFF',
                color: '#172B4D',
                border: '1px solid #DFE1E6',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                fontSize: '14px',
                fontWeight: '500',
                maxWidth: '400px',
                padding: '16px'
              },
              // Configuração específica para toasts de erro
              error: {
                duration: 8000, // Mais tempo para ler erros
                style: {
                  background: '#FFEBE6',
                  color: '#DE350B',
                  border: '1px solid #DE350B',
                  borderLeft: '4px solid #DE350B'
                },
                iconTheme: {
                  primary: '#DE350B',
                  secondary: '#FFEBE6'
                }
              },
              // Configuração específica para toasts de sucesso
              success: {
                duration: 4000,
                style: {
                  background: '#E3FCEF',
                  color: '#00875A',
                  border: '1px solid #00875A',
                  borderLeft: '4px solid #00875A'
                },
                iconTheme: {
                  primary: '#00875A',
                  secondary: '#E3FCEF'
                }
              },
              // Configuração para loading
              loading: {
                duration: Infinity,
                style: {
                  background: '#E6F7FF',
                  color: '#0052CC',
                  border: '1px solid #0052CC',
                  borderLeft: '4px solid #0052CC'
                }
              }
            }}
          />
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Rotas protegidas */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Redirecionar root para dashboard apropriado */}
              <Route index element={<DashboardRedirect />} />
              
              {/* Dashboard principal (Global, Master, Escritório, Assessor) */}
              <Route path="dashboard" element={<NewDashboard />} />
              
              {/* Gerenciamento de usuários */}
              <Route path="users" element={<UserManagementSimple />} />
              <Route path="network" element={<UserManagementSimple />} />
              <Route path="clients" element={<UserManagementSimple />} />
              
              {/* Página de teste para validação de correções */}
              <Route path="test-user-form" element={<TestUserForm />} />
              
              {/* Investimentos */}
              <Route path="investments" element={<InvestmentDashboard />} />
              <Route path="my-investments" element={<InvestorInvestments />} />
              <Route path="portfolio" element={<InvestorPortfolio />} />
              <Route path="performance" element={<InvestorPerformance />} />
              
              {/* Funcionalidades completas */}
              <Route path="debentures" element={<DebentureManagement />} />
              <Route path="comissoes" element={<CommissionsDashboard />} />
              <Route path="remuneracao" element={<RemuneracaoDashboard />} />
              <Route path="comissoes-manus" element={<ComissoesManus />} />
              <Route path="remuneracao-manus" element={<RemuneracaoManus />} />
              <Route path="my-commissions" element={<CommissionsReformulated />} />
              <Route path="audit" element={<AuditDashboard />} />
              

              <Route path="settings" element={<Settings />} />
              
              {/* STEP 2.5.1: Novas rotas de perfil hierárquicas */}
              <Route path="perfil/investidor/:id" element={<InvestorProfile />} />
              <Route path="perfil/assessor/:id" element={<AssessorProfile />} />
              <Route path="perfil/escritorio/:id" element={<EscritorioProfile />} />
              <Route path="perfil/master/:id" element={<MasterProfile />} />
              <Route path="perfil/global/:id" element={<GlobalProfile />} />
            </Route>
            
            {/* Rota de fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
    </QueryClientProvider>
  )
}

export default App