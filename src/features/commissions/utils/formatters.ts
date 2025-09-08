/**
 * Utilitários para formatação de dados de comissões
 */

/**
 * Formatar valor monetário para Real brasileiro
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Formatar porcentagem
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100)
}

/**
 * Formatar data no padrão brasileiro
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj)
}

/**
 * Formatar data e hora
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

/**
 * Formatar número com separadores de milhares
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value)
}

/**
 * Formatar status de comissão
 */
export const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'PAGO': 'Pago',
    'PENDENTE': 'Pendente',
    'VENCIDA': 'Vencida',
    'CANCELADO': 'Cancelado'
  }
  return statusMap[status] || status
}

/**
 * Formatar role/nível hierárquico
 */
export const formatRole = (role: string): string => {
  const roleMap: Record<string, string> = {
    'Global': 'Global',
    'Master': 'Master',
    'Escritório': 'Escritório',
    'Assessor': 'Assessor',
    'Investidor': 'Investidor'
  }
  return roleMap[role] || role
}

/**
 * Formatar tipo de chave PIX
 */
export const formatPixKeyType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'cpf_cnpj': 'CPF/CNPJ',
    'email': 'E-mail',
    'telefone': 'Telefone',
    'chave_aleatoria': 'Chave Aleatória'
  }
  return typeMap[type] || type
}

/**
 * Obter cor do status
 */
export const getStatusColor = (status: string): {
  bg: string
  text: string
  border: string
} => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'PAGO': {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200'
    },
    'PENDENTE': {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200'
    },
    'VENCIDA': {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200'
    },
    'CANCELADO': {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200'
    }
  }
  
  return colorMap[status] || {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200'
  }
}

/**
 * Obter cor da hierarquia
 */
export const getRoleColor = (role: string): {
  bg: string
  text: string
} => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    'Global': {
      bg: 'bg-purple-100',
      text: 'text-purple-800'
    },
    'Master': {
      bg: 'bg-blue-100',
      text: 'text-blue-800'
    },
    'Escritório': {
      bg: 'bg-green-100',
      text: 'text-green-800'
    },
    'Assessor': {
      bg: 'bg-orange-100',
      text: 'text-orange-800'
    },
    'Investidor': {
      bg: 'bg-gray-100',
      text: 'text-gray-800'
    }
  }
  
  return colorMap[role] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800'
  }
}

/**
 * Calcular dias até o vencimento
 */
export const getDaysUntilDue = (dueDate: string): number => {
  const due = new Date(dueDate)
  const today = new Date()
  const diffTime = due.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Verificar se a comissão está vencida
 */
export const isOverdue = (dueDate: string): boolean => {
  return getDaysUntilDue(dueDate) < 0
}

/**
 * Gerar nome de arquivo para exportação
 */
export const generateExportFileName = (month: number, year: number): string => {
  const monthStr = month.toString().padStart(2, '0')
  return `comissoes_${year}_${monthStr}.csv`
}

/**
 * Converter bytes para formato legível
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Validar formato de e-mail
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validar CPF (básico)
 */
export const isValidCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '')
  return cleanCPF.length === 11 && !/^(\d)\1{10}$/.test(cleanCPF)
}

/**
 * Validar CNPJ (básico)
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  return cleanCNPJ.length === 14 && !/^(\d)\1{13}$/.test(cleanCNPJ)
}

/**
 * Mascarar chave PIX para exibição
 */
export const maskPixKey = (pixKey: string, type: string): string => {
  if (!pixKey) return ''
  
  switch (type) {
    case 'cpf_cnpj':
      if (pixKey.length === 11) {
        // CPF: XXX.XXX.XXX-XX
        return pixKey.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.**$4')
      } else if (pixKey.length === 14) {
        // CNPJ: XX.XXX.XXX/XXXX-XX
        return pixKey.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.***.***/$4-$5')
      }
      return pixKey
    
    case 'email':
      const [user, domain] = pixKey.split('@')
      if (user && domain) {
        const maskedUser = user.length > 2 ? user[0] + '*'.repeat(user.length - 2) + user[user.length - 1] : user
        return `${maskedUser}@${domain}`
      }
      return pixKey
    
    case 'telefone':
      if (pixKey.length >= 10) {
        return pixKey.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-****')
      }
      return pixKey
    
    default:
      // Chave aleatória - mostrar apenas primeiros e últimos 4 caracteres
      if (pixKey.length > 8) {
        return pixKey.substring(0, 4) + '*'.repeat(pixKey.length - 8) + pixKey.substring(pixKey.length - 4)
      }
      return pixKey
  }
}