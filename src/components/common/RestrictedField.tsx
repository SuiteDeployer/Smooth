import React from 'react';
import { isRestrictedValue } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
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
const checkUserPermission = (userProfile: any, investment: any, field?: string): boolean => {
  // Se não há usuário logado, restringir
  if (!userProfile) return false;
  
  // Global sempre vê tudo
  if (userProfile.user_type === 'Global') return true;
  
  // Se não há dados do investimento, usar lógica padrão (permitir)
  if (!investment) return true;
  
  // Verificar se o usuário está no split do investimento
  const userIsInSplit = 
    investment.master_user_id === userProfile.id ||
    investment.escritorio_user_id === userProfile.id ||
    investment.head_user_id === userProfile.id ||
    investment.agente_user_id === userProfile.id ||
    investment.investor_user_id === userProfile.id;
  
  // Se o usuário está no split, ele pode ver todos os campos
  if (userIsInSplit) return true;
  
  // Lógica hierárquica para usuários não no split
  // (pode ser implementada posteriormente se necessário)
  return false;
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
  
  // Verificar se o valor é tecnicamente restrito (null/undefined)
  const valueIsEmpty = isRestrictedValue(value);
  
  // Verificar se o usuário tem permissão para ver este campo
  const userHasPermission = checkUserPermission(userProfile, investment, field);
  
  const restricted = valueIsEmpty || !userHasPermission;
  
  if (restricted) {
    return (
      <span 
        className={`restricted-field ${className}`}
        title={showTooltip ? "Esta informação está restrita ao seu nível hierárquico" : ""}
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

