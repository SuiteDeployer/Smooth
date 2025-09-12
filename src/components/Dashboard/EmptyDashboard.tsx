import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const EmptyDashboard: React.FC = () => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Smooth</h1>
              <span className="ml-2 text-sm text-gray-500">Platform</span>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/users')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Usuários
              </button>
            </nav>

            {/* User Info & Logout */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500">
                  Administrador Global
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Bem-vindo ao Smooth Platform
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Sistema de gestão de debêntures com controle hierárquico de usuários.
            </p>
          </div>

          {/* User Info Card */}
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">
                  {user?.email?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Administrador Global
              </h3>
              
              <p className="text-gray-600 mb-1">
                {user?.email}
              </p>
              
              <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                Global
              </span>
            </div>

            {/* Status */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Sistema Online</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Dashboard com área de usuários implementada
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => navigate('/users')}
              className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow-md transition-colors"
            >
              <div className="text-2xl mb-2">👥</div>
              <h3 className="text-lg font-semibold mb-2">Gerenciar Usuários</h3>
              <p className="text-sm opacity-90">
                Criar, editar e visualizar usuários com controle hierárquico
              </p>
            </button>

            <div className="bg-gray-100 p-6 rounded-lg shadow-md">
              <div className="text-2xl mb-2">🚧</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-600">Em Desenvolvimento</h3>
              <p className="text-sm text-gray-500">
                Outras funcionalidades serão implementadas em breve
              </p>
            </div>
          </div>

          {/* Development Info */}
          <div className="mt-12 bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
            <h4 className="text-lg font-semibold text-blue-900 mb-3">
              🚀 Sistema Implementado
            </h4>
            <div className="text-left space-y-2 text-sm text-blue-800">
              <p>✅ Login funcionando</p>
              <p>✅ Usuário admin@smooth.com.br configurado</p>
              <p>✅ Área de gerenciamento de usuários</p>
              <p>✅ Políticas RLS hierárquicas</p>
              <p>✅ CRUD completo de usuários</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmptyDashboard;

