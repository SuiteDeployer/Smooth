import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import EmptyDashboard from './components/Dashboard/EmptyDashboard';
import UserManagement from './components/Users/UserManagement';
import DebentureManagement from './components/Debentures/DebentureManagement';
import SeriesManagement from './components/Series/SeriesManagement';
import InvestmentManagement from './components/Investments/InvestmentManagement';
import CommissionsDashboard from './features/commissions/pages/SimpleCommissionsDashboard';
import RemuneracaoManagement from './features/remuneracao/pages/RemuneracaoManagement';
import DashboardLayout from './components/Layout/DashboardLayout';
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
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Rota protegida - Gerenciamento de debêntures */}
            <Route
              path="/debentures"
              element={
                <ProtectedRoute>
                  <DebentureManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Rota protegida - Gerenciamento de séries */}
            <Route
              path="/debentures/:debentureId/series"
              element={
                <ProtectedRoute>
                  <SeriesManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Rota protegida - Gerenciamento de investimentos */}
            <Route
              path="/investments"
              element={
                <ProtectedRoute>
                  <InvestmentManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Rota protegida - Dashboard de comissões */}
            <Route
              path="/comissoes"
              element={
                <ProtectedRoute>
                  <CommissionsDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Rota protegida - Gerenciamento de remuneração */}
            <Route
              path="/remuneracao"
              element={
                <ProtectedRoute>
                  <RemuneracaoManagement />
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

