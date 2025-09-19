import React, { useState, useEffect } from 'react';
import { isRestrictedValue } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { getUserNetworkMaster, userInInvestmentSplitSync } from '../../lib/supabase';
import './RestrictedField.css';

interface RestrictedFieldProps {
  value: any;
  type?: 'default' | 'currency' | 'percentage' | 'date' | 'datetime' | 'number';
  showTooltip?: boolean;
  className?: string;
  investment?: any;
  field?: string;
  [key: string]: any;
}

// Função para verificar se o usuário tem permissão para ver o campo (COM DEBUG)
const checkUserPermission = async (userProfile: any, investment: any, field?: string): Promise<boolean> => {
  console.log('🔍 DEBUG RestrictedField - Iniciando verificação:', {
    userProfile: userProfile ? {
      id: userProfile.id,
      email: userProfile.email,
      user_type: userProfile.user_type
    } : null,
    investment: investment ? {
      id: investment.id,
      master_user_id: investment.master_user_id,
      escritorio_user_id: investment.escritorio_user_id,
      head_user_id: investment.head_user_id,
      agente_user_id: investment.agente_user_id,
      investor_user_id: investment.investor_user_id
    } : null,
    field
  });

  // Se não há usuário logado, restringir
  if (!userProfile) {
    console.log('❌ DEBUG: Sem usuário logado');
    return false;
  }
  
  // Global sempre vê tudo
  if (userProfile.user_type === 'Global') {
    console.log('✅ DEBUG: Usuário Global - acesso total');
    return true;
  }
  
  // Se não há dados do investimento, usar lógica padrão (permitir)
  if (!investment) {
    console.log('✅ DEBUG: Sem dados de investimento - permitindo acesso');
    return true;
  }
  
  try {
    // Verificar se o usuário está no split do investimento
    const userIsInSplit = userInInvestmentSplitSync(userProfile.id, investment);
    
    console.log('🔍 DEBUG: Verificação de split:', {
      userId: userProfile.id,
      userIsInSplit,
      splitCheck: {
        master: investment.master_user_id === userProfile.id,
        escritorio: investment.escritorio_user_id === userProfile.id,
        head: investment.head_user_id === userProfile.id,
        agente: investment.agente_user_id === userProfile.id,
        investor: investment.investor_user_id === userProfile.id
      }
    });
    
    // Se o usuário está no split, ele pode ver todos os campos relacionados
    if (userIsInSplit) {
      console.log('✅ DEBUG: Usuário no split do investimento - acesso permitido');
      return true;
    }
    
    // Verificar se está na mesma rede
    console.log('🔍 DEBUG: Verificando rede...');
    const userNetwork = await getUserNetworkMaster(userProfile.id);
    const investmentNetwork = await getUserNetworkMaster(investment.master_user_id);
    
    console.log('🔍 DEBUG: Redes identificadas:', {
      userNetwork,
      investmentNetwork,
      sameNetwork: userNetwork === investmentNetwork
    });
    
    // Se não está na mesma rede, não pode ver
    if (userNetwork !== investmentNetwork) {
      console.log('🚫 DEBUG: Usuário de rede diferente bloqueado');
      return false;
    }
    
    // Master pode ver investimentos que cria (mesmo que não esteja no split)
    if (userProfile.user_type === 'Master' && investment.master_user_id === userProfile.id) {
      console.log('✅ DEBUG: Master vendo investimento que criou');
      return true;
    }
    
    console.log('🚫 DEBUG: Usuário não tem permissão - bloqueado');
    return false;
  } catch (error) {
    console.error('❌ DEBUG: Erro ao verificar permissão:', error);
    return false;
  }
};

const RestrictedFieldDebug: React.FC<RestrictedFieldProps> = ({ 
  value, 
  type = 'default', 
  showTooltip = true,
  className = '',
  investment,
  field,
  ...props 
}) => {
  const { userProfile } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Verificar permissão quando componente monta ou dados mudam
  useEffect(() => {
    const verifyPermission = async () => {
      if (!userProfile || !investment) {
        setHasPermission(true);
        return;
      }
      
      setLoading(true);
      try {
        const permission = await checkUserPermission(userProfile, investment, field);
        console.log('🔍 DEBUG: Resultado final da permissão:', {
          field,
          permission,
          value
        });
        setHasPermission(permission);
      } catch (error) {
        console.error('❌ DEBUG: Erro ao verificar permissão:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };
    
    verifyPermission();
  }, [userProfile, investment, field]);
  
  // Verificar se o valor é tecnicamente restrito (null/undefined)
  const valueIsEmpty = isRestrictedValue(value);
  
  const restricted = valueIsEmpty || !hasPermission;
  
  console.log('🔍 DEBUG: Estado final do campo:', {
    field,
    value,
    valueIsEmpty,
    hasPermission,
    restricted,
    loading
  });
  
  if (loading) {
    return (
      <span className={`restricted-field loading ${className}`} {...props}>
        ⏳ Verificando...
      </span>
    );
  }
  
  if (restricted) {
    const tooltipMessage = valueIsEmpty 
      ? "Esta informação não está disponível"
      : "Esta informação está restrita ao seu nível hierárquico ou rede";
      
    return (
      <span 
        className={`restricted-field ${className}`}
        title={showTooltip ? tooltipMessage : ""}
        {...props}
      >
        🔒 Restrito (DEBUG: {valueIsEmpty ? 'VAZIO' : 'SEM_PERMISSAO'})
      </span>
    );
  }

  // Formatar valor baseado no tipo
  let formattedValue = value;
  switch (type) {
    case 'currency':
      formattedValue = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
      break;
    case 'percentage':
      formattedValue = `${parseFloat(value).toFixed(2)}%`;
      break;
    case 'date':
      formattedValue = new Date(value).toLocaleDateString('pt-BR');
      break;
    case 'datetime':
      formattedValue = new Date(value).toLocaleString('pt-BR');
      break;
    case 'number':
      formattedValue = new Intl.NumberFormat('pt-BR').format(value);
      break;
    default:
      formattedValue = value;
  }

  return (
    <span className={className} {...props}>
      {formattedValue} (DEBUG: OK)
    </span>
  );
};

export default RestrictedFieldDebug;
