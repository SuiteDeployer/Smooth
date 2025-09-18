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
  investment?: any; // Dados do investimento para verificar se usuário está no split
  field?: string; // Nome do campo para lógica específica
  [key: string]: any;
}

// Função para verificar se o usuário tem permissão para ver o campo
const checkUserPermission = async (userProfile: any, investment: any, field?: string): Promise<boolean> => {
  // Se não há usuário logado, restringir
  if (!userProfile) return false;
  
  // Global sempre vê tudo
  if (userProfile.user_type === 'Global') return true;
  
  // Se não há dados do investimento, usar lógica padrão (permitir)
  if (!investment) return true;
  
  try {
    // Verificar se o usuário está no split do investimento
    const userIsInSplit = userInInvestmentSplitSync(userProfile.id, investment);
    
    // Se o usuário está no split, ele pode ver todos os campos relacionados
    if (userIsInSplit) {
      console.log('✅ Usuário no split do investimento:', {
        userType: userProfile.user_type,
        userId: userProfile.id,
        investmentId: investment.id
      });
      return true;
    }
    
    // Verificar se está na mesma rede
    const userNetwork = await getUserNetworkMaster(userProfile.id);
    const investmentNetwork = await getUserNetworkMaster(investment.master_user_id);
    
    // Se não está na mesma rede, não pode ver
    if (userNetwork !== investmentNetwork) {
      console.log('🚫 Usuário de rede diferente bloqueado:', {
        userNetwork,
        investmentNetwork,
        userType: userProfile.user_type
      });
      return false;
    }
    
    // Master pode ver investimentos que cria (mesmo que não esteja no split)
    if (userProfile.user_type === 'Master' && investment.master_user_id === userProfile.id) {
      console.log('✅ Master vendo investimento que criou');
      return true;
    }
    
    console.log('🚫 Usuário não está no split:', {
      userType: userProfile.user_type,
      userNetwork,
      investmentNetwork,
      userIsInSplit
    });
    
    return false;
  } catch (error) {
    console.error('❌ Erro ao verificar permissão:', error);
    return false;
  }
};

const RestrictedField: React.FC<RestrictedFieldProps> = ({ 
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
        setHasPermission(permission);
      } catch (error) {
        console.error('Erro ao verificar permissão:', error);
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
        🔒 Restrito
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
      {formattedValue}
    </span>
  );
};

export default RestrictedField;
