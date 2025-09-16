/**
 * Verifica se um valor deve ser considerado restrito
 */
export const isRestrictedValue = (value: any): boolean => {
  return value === null || value === undefined || value === '' || value === 'N/A';
};

/**
 * Formata valores que podem ser nulos/undefined para exibição
 */
export const formatRestrictedValue = (value: any, type: string = 'default'): string => {
  if (isRestrictedValue(value)) {
    return '🔒 Restrito';
  }
  
  switch (type) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return formatPercentage(value);
    case 'date':
      return formatDate(value);
    case 'datetime':
      return formatDateTime(value);
    case 'number':
      return formatNumber(value);
    default:
      return String(value);
  }
};

export const formatCurrency = (value: number | null | undefined): string => {
  if (isRestrictedValue(value)) return '🔒 Restrito';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value as number);
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (isRestrictedValue(dateString)) return '🔒 Restrito';
  
  try {
    const date = new Date(dateString as string);
    if (isNaN(date.getTime())) return 'Data inválida';
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Erro na data';
  }
};

export const formatDateTime = (dateString: string | null | undefined): string => {
  if (isRestrictedValue(dateString)) return '🔒 Restrito';
  
  try {
    const date = new Date(dateString as string);
    if (isNaN(date.getTime())) return 'Data inválida';
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Erro ao formatar data e hora:', error);
    return 'Erro na data';
  }
};

export const formatPercentage = (value: number | null | undefined): string => {
  if (isRestrictedValue(value)) return '🔒 Restrito';
  
  return `${(value as number).toFixed(2)}%`;
};

export const formatNumber = (value: number | null | undefined): string => {
  if (isRestrictedValue(value)) return '🔒 Restrito';
  
  return new Intl.NumberFormat('pt-BR').format(value as number);
};