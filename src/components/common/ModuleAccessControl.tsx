import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getModuleAccess } from '../../lib/supabase';

interface ModuleAccessControlProps {
  module: 'debentures' | 'series' | 'commissions' | 'remunerations' | 'investments' | 'users';
  action?: 'view' | 'create' | 'edit' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

const ModuleAccessControl: React.FC<ModuleAccessControlProps> = ({
  module,
  action = 'view',
  children,
  fallback = null,
  showMessage = true
}) => {
  const { userProfile } = useAuth();
  
  if (!userProfile) {
    return fallback || (showMessage ? (
      <div className="access-denied">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Carregando permissões...
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Aguarde enquanto verificamos suas permissões de acesso.
              </p>
            </div>
          </div>
        </div>
      </div>
    ) : null);
  }
  
  const moduleAccess = getModuleAccess(userProfile.user_type);
  
  // Verificar permissão baseada no módulo e ação
  let hasAccess = false;
  
  switch (module) {
    case 'debentures':
      switch (action) {
        case 'view':
          hasAccess = moduleAccess.canAccessDebentures;
          break;
        case 'create':
          hasAccess = moduleAccess.canCreateDebentures;
          break;
        case 'edit':
          hasAccess = moduleAccess.canEditDebentures;
          break;
        case 'delete':
          hasAccess = moduleAccess.canDeleteDebentures;
          break;
      }
      break;
      
    case 'series':
      switch (action) {
        case 'view':
          hasAccess = moduleAccess.canAccessSeries;
          break;
        case 'create':
          hasAccess = moduleAccess.canCreateSeries;
          break;
        case 'edit':
          hasAccess = moduleAccess.canEditSeries;
          break;
        case 'delete':
          hasAccess = moduleAccess.canDeleteSeries;
          break;
      }
      break;
      
    case 'commissions':
      hasAccess = moduleAccess.canAccessCommissions;
      break;
      
    case 'remunerations':
      hasAccess = moduleAccess.canAccessRemunerations;
      break;
      
    case 'investments':
      switch (action) {
        case 'view':
          hasAccess = true; // Todos podem ver (com RLS)
          break;
        case 'create':
          hasAccess = moduleAccess.canCreateInvestments;
          break;
        case 'edit':
          hasAccess = moduleAccess.canEditInvestments;
          break;
        case 'delete':
          hasAccess = moduleAccess.canDeleteInvestments;
          break;
      }
      break;
      
    case 'users':
      hasAccess = true; // Todos podem ver usuários (com RLS)
      break;
      
    default:
      hasAccess = false;
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (!showMessage) {
    return null;
  }
  
  // Mensagem de acesso negado personalizada por módulo
  const getAccessDeniedMessage = () => {
    const messages = {
      debentures: {
        title: 'Acesso Restrito - Debêntures',
        description: 'Esta área é restrita para investidores. Apenas usuários administrativos podem acessar o gerenciamento de debêntures.'
      },
      series: {
        title: 'Acesso Restrito - Séries',
        description: 'Esta área é restrita para investidores. Apenas usuários administrativos podem acessar o gerenciamento de séries.'
      },
      commissions: {
        title: 'Acesso Restrito - Comissões',
        description: 'Esta área é restrita para investidores. Apenas usuários que participam do sistema de comissionamento podem acessar.'
      },
      remunerations: {
        title: 'Acesso às Remunerações',
        description: 'Você pode visualizar apenas suas próprias remunerações.'
      },
      investments: {
        title: 'Ação Não Permitida',
        description: `Você não tem permissão para ${action === 'create' ? 'criar' : action === 'edit' ? 'editar' : 'deletar'} investimentos.`
      },
      users: {
        title: 'Acesso Restrito - Usuários',
        description: 'Você pode visualizar apenas usuários de sua rede hierárquica.'
      }
    };
    
    return messages[module] || {
      title: 'Acesso Negado',
      description: 'Você não tem permissão para acessar esta funcionalidade.'
    };
  };
  
  const message = getAccessDeniedMessage();
  
  return (
    <div className="access-denied">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {message.title}
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {message.description}
            </p>
            <div className="mt-2 text-xs text-red-600">
              Tipo de usuário: <span className="font-medium">{userProfile.user_type}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleAccessControl;
