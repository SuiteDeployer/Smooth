import React, { useState, useEffect } from 'react';
import { Download, Search, Filter } from 'lucide-react';
import AppLayout from '../../../components/Layout/AppLayout';

interface Commission {
  id: string;
  investment_id: string;
  user_id: string;
  commission_type: string;
  amount: number;
  installment_number: number;
  total_installments: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  created_at: string;
}

const SimpleCommissionsDashboard: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Simular carregamento de dados
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Pago', className: 'bg-green-100 text-green-800' },
      overdue: { label: 'Vencido', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Comissões</h1>
            <p className="text-gray-600 mt-1">Gerencie e acompanhe todas as comissões do sistema</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar Comissões
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por investidor, investimento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Vencido</option>
              </select>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Comissões Geradas</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debênture</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Série</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investidor</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcela</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-500">Carregando comissões...</span>
                      </div>
                    </td>
                  </tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-12 text-center text-gray-500">
                      Nenhuma comissão encontrada
                    </td>
                  </tr>
                ) : (
                  commissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{commission.id}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        -
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        -
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        -
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        -
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(commission.amount)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commission.installment_number}/{commission.total_installments}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(commission.due_date)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        {getStatusBadge(commission.status)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-blue-600 mr-3">ℹ️</div>
            <div>
              <h3 className="text-sm font-medium text-blue-900">Sistema de Comissões Ativo</h3>
              <p className="text-sm text-blue-700 mt-1">
                As comissões são geradas automaticamente quando novos investimentos são criados no sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SimpleCommissionsDashboard;

