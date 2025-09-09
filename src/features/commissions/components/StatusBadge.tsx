import React from 'react'
import { getStatusColor, formatStatus } from '../utils/formatters'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true
}) => {
  const colors = getStatusColor(status)
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const iconMap: Record<string, string> = {
    'PAGO': '✓',
    'PENDENTE': '⏳',
    'VENCIDA': '⚠️',
    'CANCELADO': '✕'
  }

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full border
      ${colors.bg} ${colors.text} ${colors.border}
      ${sizeClasses[size]}
    `}>
      {showIcon && iconMap[status] && (
        <span className="mr-1">{iconMap[status]}</span>
      )}
      {formatStatus(status)}
    </span>
  )
}

export default StatusBadge