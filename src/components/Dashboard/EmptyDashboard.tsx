import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../Layout/AppLayout';

const EmptyDashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout>
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
              {userProfile?.name || 'Usuário'}
            </h3>
            
            <p className="text-gray-600 mb-1">
              {user?.email}
            </p>
            
            <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {userProfile?.user_type || 'Usuário'}
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
        <div className={`mt-12 grid grid-cols-1 gap-6 max-w-4xl mx-auto ${userProfile?.user_type === 'Investidor' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
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

          {/* Card Debêntures - oculto para Investidores */}
          {userProfile?.user_type !== 'Investidor' && (
            <button
              onClick={() => navigate('/debentures')}
              className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg shadow-md transition-colors"
            >
              <div className="text-2xl mb-2">📊</div>
              <h3 className="text-lg font-semibold mb-2">Debêntures</h3>
              <p className="text-sm opacity-90">
                Gerenciar debêntures e captações do sistema
              </p>
            </button>
          )}

          {/* Card Investimentos - oculto para Investidores */}
          {userProfile?.user_type !== 'Investidor' && (
            <button
              onClick={() => navigate('/investments')}
              className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow-md transition-colors"
            >
              <div className="text-2xl mb-2">💰</div>
              <h3 className="text-lg font-semibold mb-2">Investimentos</h3>
              <p className="text-sm opacity-90">
                Criar e gerenciar investimentos com split de comissão
              </p>
            </button>
          )}

          {/* Card Comissões - oculto para Investidores */}
          {userProfile?.user_type !== 'Investidor' && (
            <button
              onClick={() => navigate('/comissoes')}
              className="bg-orange-600 hover:bg-orange-700 text-white p-6 rounded-lg shadow-md transition-colors"
            >
              <div className="text-2xl mb-2">💳</div>
              <h3 className="text-lg font-semibold mb-2">Comissões</h3>
              <p className="text-sm opacity-90">
                Gerenciar e acompanhar comissões do sistema
              </p>
            </button>
          )}
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
            <p>✅ Área de gerenciamento de debêntures</p>
            <p>✅ Área de gerenciamento de investimentos</p>
            <p>✅ Área de gerenciamento de comissões</p>
            <p>✅ Políticas RLS hierárquicas</p>
            <p>✅ Split de comissionamento</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default EmptyDashboard;

