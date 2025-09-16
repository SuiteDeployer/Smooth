import React, { useState, useEffect } from 'react';
import { Download, Search, Filter } from 'lucide-react';
import AppLayout from '../../../components/Layout/AppLayout';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import RestrictedField from '../../../components/common/RestrictedField';

interface Commission {
  id: string;
  investment_id: string;
  user_id: string;
  commission_type: string;
  commission_amount: number;
  installment_number: number;
  total_installments: number;
  commission_date: string;
  status: 'pending' | 'paid' | 'overdue';
  created_at: string;
  // Dados relacionados
  investment?: {
    id: string;
    investment_amount: number;
    debenture?: {
      name: string;
    };
    series?: {
      series_letter: string;
      commercial_name: string;
    };
    investor?: {
      name: string;
      email: string;
    };
    creator?: {
      name: string;
      email: string;
      user_type: string;
    };
  };
  user?: {
    name: string;
    email: string;
    user_type: string;
  };
}

const SimpleCommissionsDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Buscar comissões do Supabase
  const fetchCommissions = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Buscando comissões do Supabase...');
      console.log('Usuário atual:', userProfile?.user_type, userProfile?.email);
      console.log('ID do usuário (userProfile.id):', userProfile?.id);

      // Debug: Verificar auth.uid() do Supabase
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Auth user do Supabase:', user?.id, user?.email);

      // Debug: Verificar sessão do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Sessão Supabase:', session?.access_token ? 'Token presente' : 'Sem token');
      console.log('🔐 User da sessão:', session?.user?.id, session?.user?.email);
      console.log('🔐 Token JWT (primeiros 50 chars):', session?.access_token?.substring(0, 50));

      // Debug: Testar auth.uid() via SQL
      const { data: authTest, error: authError } = await supabase
        .rpc('auth_uid_test', {});
      console.log('🔐 Teste auth.uid() via RPC:', authTest, authError);

      // 1. Buscar comissões - deixar RLS do Supabase aplicar as políticas
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (commissionsError) {
        console.error('Erro ao buscar comissões:', commissionsError);
        throw commissionsError;
      }

      console.log('Comissões encontradas (após RLS):', commissionsData?.length || 0);
      console.log('Primeiras 3 comissões:', commissionsData?.slice(0, 3));

      if (!commissionsData || commissionsData.length === 0) {
        setCommissions([]);
        return;
      }

      // 2. Buscar dados relacionados separadamente
      const investmentIds = [...new Set(commissionsData.map(comm => comm.investment_id))];
      const userIds = [...new Set(commissionsData.map(comm => comm.user_id))];

      // Buscar investimentos
      const { data: investmentsData } = await supabase
        .from('investments')
        .select('*')
        .in('id', investmentIds);

      console.log('Investimentos encontrados:', investmentsData?.length || 0);

      // Buscar usuários das comissões
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email, user_type')
        .in('id', userIds);

      console.log('Usuários encontrados:', usersData?.length || 0);

      // Se temos investimentos, buscar dados relacionados
      let debenturesData: any[] = [];
      let seriesData: any[] = [];
      let investorsData: any[] = [];
      let creatorsData: any[] = [];

      if (investmentsData && investmentsData.length > 0) {
        const debentureIds = [...new Set(investmentsData.map(inv => inv.debenture_id))];
        const seriesIds = [...new Set(investmentsData.map(inv => inv.series_id))];
        const investorIds = [...new Set(investmentsData.map(inv => inv.investor_user_id))];
        const creatorIds = [...new Set(investmentsData.map(inv => inv.created_by))];

        // Buscar debêntures
        const { data: debData } = await supabase
          .from('debentures')
          .select('id, name')
          .in('id', debentureIds);
        debenturesData = debData || [];

        // Buscar séries
        const { data: serData } = await supabase
          .from('series')
          .select('id, series_letter, commercial_name')
          .in('id', seriesIds);
        seriesData = serData || [];

        // Buscar investidores
        const { data: invData } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', investorIds);
        investorsData = invData || [];

        // Buscar criadores dos investimentos (usando created_by que existe na tabela)
        const { data: creatorData } = await supabase
          .from('users')
          .select('id, name, email, user_type')
          .in('id', creatorIds);
        creatorsData = creatorData || [];

        console.log('Criadores encontrados:', creatorsData.length);
      }

      // 3. Combinar dados
      const enrichedCommissions = commissionsData.map(commission => ({
        ...commission,
        user: usersData?.find(u => u.id === commission.user_id),
        investment: investmentsData?.find(inv => inv.id === commission.investment_id) ? {
          ...investmentsData.find(inv => inv.id === commission.investment_id),
          debenture: debenturesData?.find(d => d.id === investmentsData.find(inv => inv.id === commission.investment_id)?.debenture_id),
          series: seriesData?.find(s => s.id === investmentsData.find(inv => inv.id === commission.investment_id)?.series_id),
          investor: investorsData?.find(u => u.id === investmentsData.find(inv => inv.id === commission.investment_id)?.investor_user_id),
          creator: creatorsData?.find(u => u.id === investmentsData.find(inv => inv.id === commission.investment_id)?.created_by)
        } : undefined
      }));

      console.log('Comissões enriquecidas:', enrichedCommissions.length);
      console.log('RLS aplicado - usuário vê:', enrichedCommissions.length, 'comissões');
      setCommissions(enrichedCommissions);
    } catch (err: any) {
      console.error('Erro ao carregar comissões:', err);
      setError(err.message || 'Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
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

  // Filtrar comissões
  const filteredCommissions = commissions.filter(commission => {
    // Filtro de busca por texto
    const matchesSearch = searchTerm === '' || 
      commission.investment?.investor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.investment?.investor?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.investment?.debenture?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.investment?.series?.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por status
    const matchesStatus = statusFilter === 'all' || commission.status === statusFilter;
    
    // Filtro por data
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const commissionDate = new Date(commission.commission_date);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = commissionDate.toDateString() === today.toDateString();
          break;
        case 'this_week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          matchesDate = commissionDate >= weekStart && commissionDate <= today;
          break;
        case 'this_month':
          matchesDate = commissionDate.getMonth() === today.getMonth() && 
                       commissionDate.getFullYear() === today.getFullYear();
          break;
        case 'custom':
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Incluir o dia inteiro
            matchesDate = commissionDate >= start && commissionDate <= end;
          }
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-red-900">Erro ao carregar comissões</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

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
            <div className="flex gap-2 flex-wrap">
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
              
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas as Datas</option>
                <option value="today">Hoje</option>
                <option value="this_week">Esta Semana</option>
                <option value="this_month">Este Mês</option>
                <option value="custom">Período Personalizado</option>
              </select>
              
              {dateFilter === 'custom' && (
                <>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Data inicial"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Data final"
                  />
                </>
              )}
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
            <h2 className="text-lg font-semibold text-gray-900">
              Comissões Geradas ({filteredCommissions.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">ID</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Debênture</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Série</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Investidor</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Valor</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Parcela</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Vencimento</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Status</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Ações</th>
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
                ) : filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-12 text-center text-gray-500">
                      {commissions.length === 0 ? 'Nenhuma comissão encontrada' : 'Nenhuma comissão corresponde aos filtros'}
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-gray-50">
                      <td className="px-2 py-3 whitespace-nowrap text-xs font-medium text-gray-900 w-20">
                        <span className="truncate block" title={`#${commission.id}`}>
                          #{commission.id.toString().slice(-6)}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900 w-24">
                        <span className="truncate block">
                          <RestrictedField value={commission.investment?.debenture?.name} />
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900 w-32">
                        <span className="truncate block">
                          <RestrictedField value={commission.investment?.series ? 
                            `${commission.investment.series.series_letter} - ${commission.investment.series.commercial_name}` : 
                            null
                          } />
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900 w-40">
                        <span className="truncate block" title={commission.investment?.investor?.name || 'N/A'}>
                          <RestrictedField value={commission.investment?.investor?.name} />
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900 w-24">
                        <span className="truncate block" title={formatCurrency(commission.commission_amount || 0)}>
                          {formatCurrency(commission.commission_amount || 0)}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900 w-16 text-center">
                        {commission.installment_number || 0}/{commission.total_installments || 0}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900 w-24">
                        <span className="truncate block">
                          <RestrictedField value={commission.commission_date} type="date" />
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap w-20">
                        {getStatusBadge(commission.status || 'pending')}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-xs font-medium w-16">
                        {userProfile?.user_type === 'Global' && (
                          <button className="text-blue-600 hover:text-blue-900 text-xs">
                            Editar
                          </button>
                        )}
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
                {commissions.length > 0 && ` Total de ${commissions.length} comissões encontradas.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SimpleCommissionsDashboard;

