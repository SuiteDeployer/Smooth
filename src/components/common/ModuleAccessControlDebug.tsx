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

const ModuleAccessControlDebug: React.FC<ModuleAccessControlProps> = ({
  module,
  action = 'view',
  children,
  fallback = null,
  showMessage = true
}) => {
  const { userProfile, user, loading } = useAuth();
  
  // LOGS DETALHADOS PARA DEBUG
  console.log('=== ModuleAccessControl DEBUG ===');
  console.log('Module:', module);
  console.log('Action:', action);
  console.log('Loading:', loading);
  console.log('User (auth):', user ? { id: user.id, email: user.email } : null);
  console.log('UserProfile:', userProfile ? { 
    id: userProfile.id, 
    email: userProfile.email, 
    name: userProfile.name,
    user_type: userProfile.user_type 
  } : null);
  
  if (loading) {
    console.log('🔄 AuthContext ainda carregando...');
    return (
      <div className="access-denied">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                AuthContext carregando...
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Aguarde enquanto carregamos seus dados de autenticação.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!userProfile) {
    console.log('❌ UserProfile é null - mostrando "Carregando permissões"');
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
              <div className="mt-2 text-xs text-yellow-600">
                DEBUG: userProfile é null | user: {user ? 'existe' : 'null'} | loading: {loading ? 'true' : 'false'}
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null);
  }
  
  const moduleAccess = getModuleAccess(userProfile.user_type);
  console.log('ModuleAccess para', userProfile.user_type, ':', moduleAccess);
  
  // Verificar permissão baseada no módulo e ação
  let hasAccess = false;
  
  switch (module) {
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
      
    default:
      hasAccess = false;
  }
  
  console.log('HasAccess:', hasAccess, 'para', module, action);
  
  if (hasAccess) {
    console.log('✅ Acesso permitido - renderizando children');
    return <>{children}</>;
  }
  
  console.log('❌ Acesso negado');
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
              Acesso Negado - {module}
            </h3>
            <p className="mt-1 text-sm text-red-700">
              Você não tem permissão para {action} neste módulo.
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

export default ModuleAccessControlDebug;
