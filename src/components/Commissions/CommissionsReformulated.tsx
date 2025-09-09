import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  User,
  CreditCard,
  Building
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { CsvActions } from './CsvActions';
import { CommissionsTable } from './CommissionsTable';

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

interface CommissionStats {
  total_amount: number;
  total_count: number;
  paid_count: number;
  pending_count: number;
  canceled_count: number;
}

const CommissionsReformulated: React.FC = () => {
  const { userProfile } = useAuth();
  const [commissions, setCommissions] = useState<CommissionDetailed[]>([]);
  const [stats, setStats] = useState<CommissionStats>({
    total_amount: 0,
    total_count: 0,
    paid_count: 0,
    pending_count: 0,
    canceled_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Carregar comissões da view criada
  const loadCommissions = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('commissions_detailed')
        .select('*');
      
      // Aplicar filtros
      if (searchTerm) {
        query = query.or(`beneficiary_name.ilike.%${searchTerm}%,beneficiary_pix.ilike.%${searchTerm}%,series_name.ilike.%${searchTerm}%`);
      }
      
      if (statusFilter !== 'todos') {
        query = query.eq('payment_status', statusFilter);
      }
      
      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar comissões:', error);
        setCommissions([]);
      } else {
        setCommissions(data || []);
        
        // Calcular estatísticas
        const statsData = {
          total_amount: (data || []).reduce((sum, c) => sum + Number(c.commission_amount), 0),
          total_count: data?.length || 0,
          paid_count: (data || []).filter(c => c.payment_status === 'PAGO').length,
          pending_count: (data || []).filter(c => c.payment_status === 'PENDENTE').length,
          canceled_count: (data || []).filter(c => c.payment_status === 'CANCELADO').length
        };
        setStats(statsData);
      }
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadCommissions();
  };

  const handleFilterChange = (newFilter: string) => {
    setStatusFilter(newFilter);
    setCurrentPage(1);
    setTimeout(() => loadCommissions(), 100);
  };

  useEffect(() => {
    loadCommissions();
  }, [currentPage]);

  return (
    <main className="flex-1 p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestão de Comissões</h1>
            <p className="text-gray-500 mt-1">Sistema reformulado com controle de parcelas mensais</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <CsvActions 
              commissions={commissions}
              onImportComplete={loadCommissions}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </button>
            <button
              onClick={loadCommissions}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Área de Filtros */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Filtros de Busca</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Buscar</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Nome, PIX ou Série..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="PAGO">Pago</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total em Comissões</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(stats.total_amount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Comissões Pagas</p>
                <p className="text-2xl font-bold text-gray-800">{stats.paid_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-amber-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-gray-800">{stats.pending_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Registros</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total_count}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Comissões */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Lista de Comissões</h2>
            <p className="text-sm text-gray-500 mt-1">
              Exibindo {commissions.length} comissões com controle de parcelas mensais
            </p>
          </div>
          
          <CommissionsTable 
            commissions={commissions}
            loading={loading}
            onRefresh={loadCommissions}
          />
        </div>

        {/* Paginação (implementar se necessário) */}
        {commissions.length >= itemsPerPage && (
          <div className="flex justify-center items-center space-x-4 py-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500">
              Página {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={commissions.length < itemsPerPage}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default CommissionsReformulated;