import React, { useState } from 'react'
import { Edit, Trash2, Archive, MoreHorizontal, Eye, Download, Copy } from 'lucide-react'

interface Action {
  key: string
  label: string
  icon: React.ComponentType<any>
  color?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success'
  disabled?: boolean
  hidden?: boolean
}

interface ActionButtonsProps {
  actions: Action[]
  onAction: (actionKey: string) => void
  variant?: 'buttons' | 'dropdown' | 'mixed'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  actions,
  onAction,
  variant = 'buttons',
  size = 'md',
  className = ''
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const getColorClasses = (color: string = 'secondary') => {
    switch (color) {
      case 'primary':
        return 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
      case 'danger':
        return 'text-red-600 hover:text-red-800 hover:bg-red-50'
      case 'warning':
        return 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50'
      case 'success':
        return 'text-green-600 hover:text-green-800 hover:bg-green-50'
      default:
        return 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
    }
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'p-1'
      case 'lg':
        return 'p-3'
      default:
        return 'p-2'
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

  const visibleActions = actions.filter(action => !action.hidden)
  const sizeClasses = getSizeClasses(size)
  const iconSize = getIconSize(size)

  if (visibleActions.length === 0) {
    return null
  }

  const renderButton = (action: Action, inDropdown = false) => {
    const Icon = action.icon
    const colorClasses = getColorClasses(action.color)
    
    if (inDropdown) {
      return (
        <button
          key={action.key}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Botão dropdown clicado:', action.key);
            onAction(action.key);
            setIsDropdownOpen(false);
          }}
          disabled={action.disabled}
          className={`w-full flex items-center space-x-2 px-4 py-2 text-sm ${colorClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Icon className={iconSize} />
          <span>{action.label}</span>
        </button>
      )
    }

    return (
      <button
        key={action.key}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🖱️ Botão clicado:', action.key);
          onAction(action.key);
        }}
        disabled={action.disabled}
        title={action.label}
        className={`${sizeClasses} rounded-md transition-colors ${colorClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Icon className={iconSize} />
      </button>
    )
  }

  if (variant === 'dropdown' || (variant === 'mixed' && visibleActions.length > 3)) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`${sizeClasses} rounded-md transition-colors text-gray-600 hover:text-gray-800 hover:bg-gray-50`}
        >
          <MoreHorizontal className={iconSize} />
        </button>
        
        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
              <div className="py-1">
                {visibleActions.map(action => renderButton(action, true))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  if (variant === 'mixed') {
    const primaryActions = visibleActions.slice(0, 2)
    const secondaryActions = visibleActions.slice(2)

    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {primaryActions.map(action => renderButton(action))}
        
        {secondaryActions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`${sizeClasses} rounded-md transition-colors text-gray-600 hover:text-gray-800 hover:bg-gray-50`}
            >
              <MoreHorizontal className={iconSize} />
            </button>
            
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    {secondaryActions.map(action => renderButton(action, true))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {visibleActions.map(action => renderButton(action))}
    </div>
  )
}

export default ActionButtons

// Exemplos de ações comuns
export const COMMON_ACTIONS = {
  VIEW: { key: 'view', label: 'Visualizar', icon: Eye, color: 'primary' as const },
  EDIT: { key: 'edit', label: 'Editar', icon: Edit, color: 'primary' as const },
  DELETE: { key: 'delete', label: 'Excluir', icon: Trash2, color: 'danger' as const },
  ARCHIVE: { key: 'archive', label: 'Arquivar', icon: Archive, color: 'warning' as const },
  DOWNLOAD: { key: 'download', label: 'Download', icon: Download, color: 'secondary' as const },
  COPY: { key: 'copy', label: 'Copiar', icon: Copy, color: 'secondary' as const },
}
