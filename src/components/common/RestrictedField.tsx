import React from 'react';
import { isRestrictedValue } from '../../utils/formatters';
import './RestrictedField.css';

interface RestrictedFieldProps {
  value: any;
  type?: 'default' | 'currency' | 'percentage' | 'date' | 'datetime' | 'number';
  showTooltip?: boolean;
  className?: string;
  [key: string]: any;
}

const RestrictedField: React.FC<RestrictedFieldProps> = ({ 
  value, 
  type = 'default', 
  showTooltip = true,
  className = '',
  ...props 
}) => {
  const restricted = isRestrictedValue(value);
  
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

