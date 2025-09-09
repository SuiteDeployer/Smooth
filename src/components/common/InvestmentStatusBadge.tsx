import React from 'react'
import { CheckCircle, Clock, XCircle, AlertCircle, ArrowRight } from 'lucide-react'

interface InvestmentStatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const InvestmentStatusBadge: React.FC<InvestmentStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return {
          label: 'Ativo',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle
        }
      case 'redeemed':
        return {
          label: 'Resgatado',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: ArrowRight
        }
      case 'canceled':
        return {
          label: 'Cancelado',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle
        }
      case 'processing':
        return {
          label: 'Processando',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock
        }
      case 'pending':
        return {
          label: 'Pendente',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertCircle
        }
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: AlertCircle
        }
    }
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'lg':
        return 'px-4 py-2 text-base'
      default:
        return 'px-3 py-1 text-sm'
    }
  }

  const getIconSize = (size: string) => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3'
      case 'lg':
        return 'h-5 w-5'
      default:
        return 'h-4 w-4'
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon
  const sizeClasses = getSizeClasses(size)
  const iconSize = getIconSize(size)

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.color} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon className={`${iconSize} mr-1`} />}
      {config.label}
    </span>
  )
}

export default InvestmentStatusBadge
