import React from 'react';

interface StatusBadgeProps {
  status: 'PAGO' | 'PENDENTE' | 'CANCELADO';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAGO':
        return {
          label: 'Pago',
          className: 'bg-green-100 text-green-800'
        };
      case 'PENDENTE':
        return {
          label: 'Pendente',
          className: 'bg-amber-100 text-amber-800'
        };
      case 'CANCELADO':
        return {
          label: 'Cancelado',
          className: 'bg-red-100 text-red-800'
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}>
      {config.label}
    </span>
  );
};