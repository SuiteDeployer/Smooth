import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const getUserTypeLabel = (userType: string | undefined) => {
    switch (userType) {
      case 'Global':
        return 'Administrador Global';
      case 'Master':
        return 'Master';
      case 'Escritório':
        return 'Escritório';
      case 'Assessor':
        return 'Assessor';
      case 'Investidor':
        return 'Investidor';
      default:
        return 'Usuário';
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
              {/* Debêntures - oculto para Investidores */}
              {userProfile?.user_type !== 'Investidor' && (
                <button
                  onClick={() => navigate('/debentures')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Debêntures
                </button>
              )}
              {/* Investimentos - oculto para Investidores */}
              {userProfile?.user_type !== 'Investidor' && (
                <button
                  onClick={() => navigate('/investments')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Investimentos
                </button>
              )}
              {/* Comissões - oculto para Investidores */}
              {userProfile?.user_type !== 'Investidor' && (
                <button
                  onClick={() => navigate('/comissoes')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Comissões
                </button>
              )}
              {/* Remuneração - visível para todos */}
              <button
                onClick={() => navigate('/remuneracao')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Remuneração
              </button>
            </nav>

            {/* User Info & Logout */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500">
                  {getUserTypeLabel(userProfile?.user_type)}
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
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;

