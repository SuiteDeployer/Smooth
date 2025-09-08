import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Search, 
  Filter,
  Download,
  RefreshCw,
  User,
  Building,
  CreditCard
} from 'lucide-react';

interface Commission {
  id: string;
  investment_id: string;
  recipient_user_id: string;
  commission_percentage: number;
  commission_amount: number;
  commission_type: string;
  payment_status: string;
  payment_month: string;
  created_at: string;
  paid_at?: string;
  investment?: any;
  recipient_user?: any;
}

interface CommissionStats {
  total_commissions: number;
  total_amount: number;
  pending_count: number;
  paid_count: number;
  processing_count: number;
}

const EnhancedCommissions: React.FC = () => {
  const { userProfile } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<CommissionStats>({
    total_commissions: 0,
    total_amount: 0,
    pending_count: 0,
    paid_count: 0,
    processing_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'pending': 'Pendente',
      'processing': 'Processando',
      'paid': 'Pago',
      'approved': 'Aprovado',
      'rejected': 'Rejeitado',
      'canceled': 'Cancelado'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800', 
      'paid': 'bg-green-100 text-green-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'canceled': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      'master': 'Master',
      'escritorio': 'Escritório',
      'assessor': 'Assessor'
    };
    return labels[type] || type;
  };

  const loadCommissions = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commission-system?action=get_commissions_list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            search_term: searchTerm,
            status_filter: statusFilter,
            commission_type_filter: typeFilter,
            limit: 100,
            offset: 0
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar comissões');
      }

      const result = await response.json();
      
      if (result.data) {
        setCommissions(result.data.commissions || []);
        setStats(result.data.stats || {});
      }
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadCommissions();
  };

  const handleFilterChange = (type: string, value: string) => {
    if (type === 'status') {
      setStatusFilter(value);
    } else if (type === 'type') {
      setTypeFilter(value);
    }
    // Auto-aplicar filtros
    setTimeout(() => loadCommissions(), 100);
  };

  const processMonthlyCommissions = async () => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commission-system?action=process_monthly_commissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ month: currentMonth })
        }
      );

      if (response.ok) {
        loadCommissions(); // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao processar comissões:', error);
    }
  };

  useEffect(() => {
    loadCommissions();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Comissões</h1>
          <p className="text-gray-600">Visualize e gerencie todas as comissões geradas pelos investimentos</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={loadCommissions} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          {userProfile?.user_roles?.role_name === 'Global' && (
            <Button onClick={processMonthlyCommissions}>
              <Clock className="w-4 h-4 mr-2" />
              Processar Mês
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros de Busca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar por CNPJ, Nome ou Série</Label>
                <div className="flex space-x-2">
                  <Input
                    id="search"
                    placeholder="Digite para buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} size="sm">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Comissão</Label>
                <Select value={typeFilter} onValueChange={(value) => handleFilterChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                    <SelectItem value="escritorio">Escritório</SelectItem>
                    <SelectItem value="assessor">Assessor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total em Comissões</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.total_amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Comissões Pagas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.paid_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Em Processamento</p>
                <p className="text-2xl font-bold text-gray-900">{stats.processing_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Comissões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comissões Detalhadas</CardTitle>
          <CardDescription>
            Lista completa de todas as comissões geradas pelos investimentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando comissões...</p>
            </div>
          ) : commissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investimento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investidor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beneficiário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Investimento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comissão
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mês Ref.
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {commission.investment?.series?.name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {commission.investment?.series?.debentures?.issuer_name || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {commission.investment?.investor_user?.full_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {commission.investment?.investor_user?.cpf_cnpj || 'CNPJ não informado'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {commission.recipient_user?.full_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getTypeLabel(commission.commission_type)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(commission.investment?.invested_amount || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(commission.commission_amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {commission.commission_percentage.toFixed(2)}%
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getTypeLabel(commission.commission_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(commission.payment_status)}`}>
                          {getStatusLabel(commission.payment_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commission.payment_month}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma comissão encontrada</p>
              <p className="text-sm text-gray-400 mt-1">
                As comissões aparecerão aqui quando investimentos com percentuais de comissão forem criados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedCommissions;
