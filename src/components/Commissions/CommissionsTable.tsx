import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { User, CreditCard, Building, DollarSign } from 'lucide-react';

interface CommissionDetailed {
  id: string;
  investment_id: string;
  recipient_user_id: string;
  commission_percentage: number;
  commission_amount: number;
  commission_type: string;
  payment_status: 'PAGO' | 'PENDENTE' | 'CANCELADO';
  paid_installments: number;
  total_installments: number;
  payment_month: string;
  created_at: string;
  paid_at?: string;
  beneficiary_name: string;
  beneficiary_pix?: string;
  pix_key_type: string;
  duration_months: number;
  series_name: string;
  series_code: string;
  monthly_commission: number;
  pending_installments: number;
  invested_amount: number;
  investment_date: string;
  investor_name: string;
  investor_document?: string;
}

interface CommissionsTableProps {
  commissions: CommissionDetailed[];
  loading: boolean;
  onRefresh: () => void;
}

export const CommissionsTable: React.FC<CommissionsTableProps> = ({ 
  commissions, 
  loading, 
  onRefresh 
}) => {
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {/* Skeleton loading */}
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex space-x-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="p-8 text-center">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Nenhuma comissão encontrada</p>
        <p className="text-sm text-gray-400 mt-1">
          As comissões aparecerão aqui quando investimentos forem criados
        </p>
        <button
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Atualizar Lista
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Beneficiário
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo de Chave
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              PIX
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Comissão Mensal
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Parcela
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Série
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {commissions.map((commission) => (
            <tr key={commission.id} className="hover:bg-gray-50 transition-colors">
              {/* Beneficiário */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {commission.beneficiary_name || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {commission.commission_type}
                    </div>
                  </div>
                </div>
              </td>

              {/* Tipo de Chave */}
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                  {commission.pix_key_type}
                </span>
              </td>

              {/* PIX */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-800 font-mono">
                  {commission.beneficiary_pix || 'Não informado'}
                </div>
              </td>

              {/* Comissão Mensal */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 text-green-500 mr-1 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {formatCurrency(Number(commission.monthly_commission))}
                    </div>
                    <div className="text-xs text-gray-500">
                      Total: {formatCurrency(commission.commission_amount)}
                    </div>
                  </div>
                </div>
              </td>

              {/* Parcela */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-800">
                  <span className="font-medium text-green-600">
                    {commission.paid_installments} Pago
                  </span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="font-medium text-amber-600">
                    {commission.pending_installments} Pendente
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {commission.duration_months} meses total
                </div>
              </td>

              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={commission.payment_status} />
                {commission.paid_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    Pago em {formatDate(commission.paid_at)}
                  </div>
                )}
              </td>

              {/* Série */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {commission.series_code}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {commission.series_name}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};