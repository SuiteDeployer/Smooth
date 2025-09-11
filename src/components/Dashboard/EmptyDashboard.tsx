import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const EmptyDashboard: React.FC = () => {
  const { user, userProfile, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
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

            {/* User Info & Logout */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {userProfile?.name || user?.email}
                </p>
                <p className="text-xs text-gray-500">
                  {userProfile?.user_type || 'Usuário'}
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
              Sistema de gestão de debêntures limpo e pronto para desenvolvimento.
            </p>
          </div>

          {/* User Info Card */}
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">
                  {userProfile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {userProfile?.name || 'Usuário'}
              </h3>
              
              <p className="text-gray-600 mb-1">
                {user?.email}
              </p>
              
              <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                {userProfile?.user_type || 'Global'}
              </span>
            </div>

            {/* Status */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Sistema Online</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Dashboard limpo - Pronto para desenvolvimento
              </p>
            </div>
          </div>

          {/* Development Info */}
          <div className="mt-12 bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
            <h4 className="text-lg font-semibold text-blue-900 mb-3">
              🚀 Sistema Limpo
            </h4>
            <div className="text-left space-y-2 text-sm text-blue-800">
              <p>✅ Login funcionando</p>
              <p>✅ Usuário admin@smooth.com.br configurado</p>
              <p>✅ Dashboard vazio pronto</p>
              <p>✅ Banco de dados limpo</p>
              <p>✅ Pronto para desenvolvimento do zero</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmptyDashboard;

