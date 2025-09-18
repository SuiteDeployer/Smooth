import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getModuleAccess } from './lib/supabase';
import LoginForm from './components/Auth/LoginForm';
import EmptyDashboard from './components/Dashboard/EmptyDashboard';
import UserManagement from './components/Users/UserManagement';
import DebentureManagement from './components/Debentures/DebentureManagement';
import SeriesManagement from './components/Series/SeriesManagement';
import InvestmentManagement from './components/Investments/InvestmentManagement';
import CommissionsDashboard from './features/commissions/pages/SimpleCommissionsDashboard';
import RemuneracaoManagement from './features/remuneracao/pages/RemuneracaoManagement';
import DashboardLayout from './components/Layout/DashboardLayout';
import AgenteDashboard from './components/Dashboard/AgenteDashboard';
import AgenteProfile from './components/Profile/AgenteProfile';
import ModuleAccessControl from './components/common/ModuleAccessControl';
import './App.css';

// Componente para proteger rotas que precisam de autenticação
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Componente para proteger rotas com controle de acesso por módulo
function ModuleProtectedRoute({ 
  module, 
  action = 'view', 
  children 
}: { 
  module: 'debentures' | 'series' | 'commissions' | 'remunerations' | 'investments' | 'users';
  action?: 'view' | 'create' | 'edit' | 'delete';
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <ModuleAccessControl module={module} action={action}>
        {children}
      </ModuleAccessControl>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          {/* Configuração dos Toasts */}
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
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
              error: {
                duration: 8000,
                style: {
                  background: '#FFEBE6',
                  color: '#DE350B',
                  border: '1px solid #DE350B',
                  borderLeft: '4px solid #DE350B'
                }
              },
              success: {
                duration: 4000,
                style: {
                  background: '#E3FCEF',
                  color: '#00875A',
                  border: '1px solid #00875A',
                  borderLeft: '4px solid #00875A'
                }
              }
            }}
          />
          
          <Routes>
            {/* Rota pública - Login */}
            <Route path="/login" element={<LoginForm />} />
            
            {/* Rota protegida - Dashboard vazio */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <EmptyDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Rota protegida - Gerenciamento de usuários */}
            <Route
              path="/users"
              element={
                <ModuleProtectedRoute module="users">
                  <UserManagement />
                </ModuleProtectedRoute>
              }
            />
            
            {/* Rota protegida - Gerenciamento de debêntures (BLOQUEADA para Investidores) */}
            <Route
              path="/debentures"
              element={
                <ModuleProtectedRoute module="debentures">
                  <DebentureManagement />
                </ModuleProtectedRoute>
              }
            />
            
            {/* Rota protegida - Gerenciamento de séries (BLOQUEADA para Investidores) */}
            <Route
              path="/debentures/:debentureId/series"
              element={
                <ModuleProtectedRoute module="series">
                  <SeriesManagement />
                </ModuleProtectedRoute>
              }
            />
            
            {/* Rota protegida - Gerenciamento de investimentos */}
            <Route
              path="/investments"
              element={
                <ModuleProtectedRoute module="investments">
                  <InvestmentManagement />
                </ModuleProtectedRoute>
              }
            />
            
            {/* Rota protegida - Dashboard de comissões (BLOQUEADA para Investidores) */}
            <Route
              path="/comissoes"
              element={
                <ModuleProtectedRoute module="commissions">
                  <CommissionsDashboard />
                </ModuleProtectedRoute>
              }
            />
            
            {/* Rota protegida - Gerenciamento de remuneração */}
            <Route
              path="/remuneracao"
              element={
                <ModuleProtectedRoute module="remunerations">
                  <RemuneracaoManagement />
                </ModuleProtectedRoute>
              }
            />
            
            {/* Rota protegida - Dashboard do Agente */}
            <Route
              path="/agente/dashboard"
              element={
                <ProtectedRoute>
                  <AgenteDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Rota protegida - Perfil do Agente */}
            <Route
              path="/agente/profile"
              element={
                <ProtectedRoute>
                  <AgenteProfile />
                </ProtectedRoute>
              }
            />
            
            {/* Redirecionamentos */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
