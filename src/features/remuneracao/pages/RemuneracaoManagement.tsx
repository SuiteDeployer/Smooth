import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import AppLayout from '../../../components/Layout/AppLayout';
import { Filter, Download } from 'lucide-react';
import RestrictedField from '../../../components/common/RestrictedFieldDebug';

interface Remuneration {
  id: string;
  investment_id: number;
  investor_user_id: string;
  remuneration_amount: number;
  remuneration_date: string;
  status: 'pending' | 'paid';
  created_at: string;
  investment?: {
    id: number;
    debenture?: {
      name: string;
    };
    series?: {
      name: string;
      commercial_name: string;
    };
  };
  investor?: {
    name: string;
    email: string;
    pix?: string;
  };
}

const RemuneracaoManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const [remunerations, setRemunerations] = useState<Remuneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Carregar remunerações
  const loadRemunerations = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Carregando remunerações...');
      
      const { data, error } = await supabase
        .from('remunerations')
        .select(`
          *,
          investment:investments!inner(
            id,
            series_id,
            debenture:debentures(name)
          ),
          investor:users!investor_user_id(name, email, pix)
        `)
        .order('remuneration_date', { ascending: false });

      if (error) {
        console.error('Erro ao carregar remunerações:', error);
        throw error;
      }

      console.log('✅ Remunerações carregadas:', data?.length || 0);
      
      // Buscar dados das séries separadamente para evitar conflito de relacionamento
      if (data && data.length > 0) {
        const seriesIds = [...new Set(data.map(r => r.investment?.series_id).filter(Boolean))];
        
        if (seriesIds.length > 0) {
          const { data: seriesData } = await supabase
            .from('series')
            .select('id, name, commercial_name')
            .in('id', seriesIds);
          
          // Enriquecer remunerações com dados das séries
          const enrichedData = data.map(remuneration => ({
            ...remuneration,
            investment: {
              ...remuneration.investment,
              series: seriesData?.find(s => s.id === remuneration.investment?.series_id)
            }
          }));
          
          setRemunerations(enrichedData);
        } else {
          setRemunerations(data);
        }
      } else {
        setRemunerations(data || []);
      }

    } catch (error) {
      console.error('Erro ao carregar remunerações:', error);
      setError('Erro ao carregar remunerações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRemunerations();
  }, []);

  // Filtrar remunerações
  const filteredRemunerations = remunerations.filter((remuneration) => {
    // Filtro de busca
    const searchMatch = !searchTerm || 
      remuneration.investor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      remuneration.investor?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      remuneration.investment?.debenture?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      remuneration.investment?.series?.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de status
    const statusMatch = statusFilter === 'all' || remuneration.status === statusFilter;

    // Filtro de data
    let dateMatch = true;
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      dateMatch = remuneration.remuneration_date === today;
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateMatch = new Date(remuneration.remuneration_date) >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateMatch = new Date(remuneration.remuneration_date) >= monthAgo;
    } else if (dateFilter === 'custom' && startDate && endDate) {
      const remunerationDate = new Date(remuneration.remuneration_date);
      dateMatch = remunerationDate >= new Date(startDate) && remunerationDate <= new Date(endDate);
    }

    return searchMatch && statusMatch && dateMatch;
  });

  // Exportar para CSV
  const exportToCSV = () => {
    if (filteredRemunerations.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'ID',
      'Investimento',
      'Debênture',
      'Série',
      'Investidor',
      'Email',
      'PIX',
      'Valor',
      'Data',
      'Status'
    ];

    const csvData = filteredRemunerations.map(remuneration => [
      `#${remuneration.id.slice(-6)}`,
      `#${remuneration.investment_id}`,
      remuneration.investment?.debenture?.name || 'N/A',
      remuneration.investment?.series?.commercial_name || 'N/A',
      remuneration.investor?.name || 'N/A',
      remuneration.investor?.email || 'N/A',
      remuneration.investor?.pix || 'N/A',
      `R$ ${remuneration.remuneration_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      new Date(remuneration.remuneration_date).toLocaleDateString('pt-BR'),
      remuneration.status === 'pending' ? 'Pendente' : 'Pago'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `remuneracoes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formatar status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'paid': return 'Pago';
      default: return status;
    }
  };

  // Formatar valor
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Remuneração</h1>
            <p className="text-gray-600">Acompanhe as remunerações dos investimentos</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Busca */}
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Investidor, email, debênture, série..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
              </select>
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas as datas</option>
                <option value="today">Hoje</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mês</option>
                <option value="custom">Período personalizado</option>
              </select>
            </div>

            {/* Período personalizado */}
            {dateFilter === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data inicial
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data final
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* Exportar */}
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Remunerações ({filteredRemunerations.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    ID
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Investimento
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Debênture
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Série
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Investidor
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Valor
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Data
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Carregando remunerações...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRemunerations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-gray-500">
                      {remunerations.length === 0 ? 'Nenhuma remuneração encontrada' : 'Nenhuma remuneração corresponde aos filtros'}
                    </td>
                  </tr>
                ) : (
                  filteredRemunerations.map((remuneration) => (
                    <tr key={remuneration.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap text-xs font-medium text-gray-900 w-20">
                        <span className="truncate block" title={`#${remuneration.id}`}>
                          #{remuneration.id.slice(-6)}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900 w-24">
                        <span className="truncate block">
                          #{remuneration.investment_id}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900 w-32">
                        <span className="truncate block">
                          <RestrictedField value={remuneration.investment?.debenture?.name} investment={remuneration.investment} field="debenture" />
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900 w-32">
                        <span className="truncate block">
                          <RestrictedField value={remuneration.investment?.series?.commercial_name} investment={remuneration.investment} field="series" />
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900 w-40">
                        <div className="truncate">
                          <div className="font-medium">
                            <RestrictedField value={remuneration.investor?.name || remuneration.investor?.email} investment={remuneration.investment} field="investor" />
                          </div>
                          {remuneration.investor?.pix && (
                            <div className="text-gray-500 text-xs">
                              PIX: <RestrictedField value={remuneration.investor.pix} investment={remuneration.investment} field="investor_pix" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900 w-32">
                        <span className="font-medium">
                          {formatCurrency(remuneration.remuneration_amount)}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900 w-28">
                        {formatDate(remuneration.remuneration_date)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs w-24">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          remuneration.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : remuneration.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getStatusLabel(remuneration.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mensagens de erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default RemuneracaoManagement;

