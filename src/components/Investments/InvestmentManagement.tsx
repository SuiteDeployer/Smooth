import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../Layout/AppLayout';

interface Investment {
  id: string;
  debenture_id: string;
  series_id: string;
  investor_id: string;
  responsible_id: string;
  investment_date: string;
  maturity_date: string;
  amount: number;
  annual_remuneration: number;
  monthly_remuneration: number;
  max_annual_commission: number;
  max_monthly_commission: number;
  master_id?: string;
  master_percentage?: number;
  office_id?: string;
  office_percentage?: number;
  advisor_id?: string;
  advisor_percentage?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Debenture {
  id: string;
  name: string;
  total_amount: number;
  status: string;
}

interface Series {
  id: string;
  debenture_id: string;
  series_letter: string;
  commercial_name: string;
  term_months: number;
  max_commission_year: number;
  max_commission_month: number;
  remuneration_year: number;
  remuneration_month: number;
  captacao_amount: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  user_type: string;
}

const InvestmentManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [debentures, setDebentures] = useState<Debenture[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [networkUsers, setNetworkUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [formData, setFormData] = useState({
    debenture_id: '',
    series_id: '',
    investor_id: '',
    amount: '',
    master_id: '',
    master_percentage: '',
    office_id: '',
    office_percentage: '',
    advisor_id: '',
    advisor_percentage: ''
  });

  // Verificar permissões
  const isGlobalUser = userProfile?.user_type === 'Global';
  const isMasterUser = userProfile?.user_type === 'Master';
  const isOfficeUser = userProfile?.user_type === 'Escritório';
  const isAdvisorUser = userProfile?.user_type === 'Assessor';
  const isInvestorUser = userProfile?.user_type === 'Investidor';

  const canCreateInvestments = isGlobalUser || isMasterUser || isOfficeUser || isAdvisorUser;
  const canEditInvestments = isGlobalUser || isMasterUser || isOfficeUser || isAdvisorUser;

  useEffect(() => {
    if (!userProfile) {
      navigate('/');
      return;
    }

    if (isInvestorUser) {
      // Investidor só vê seus próprios investimentos
      fetchInvestorInvestments();
    } else {
      fetchInvestments();
    }
    
    fetchDebentures();
    fetchNetworkUsers();
  }, [userProfile]);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('investments')
        .select(`
          *,
          debentures(name),
          series(series_letter, commercial_name),
          investor:users!investments_investor_id_fkey(name, email),
          responsible:users!investments_responsible_id_fkey(name, email)
        `);

      // Aplicar filtros baseados no tipo de usuário
      if (isMasterUser) {
        // Master vê investimentos de sua rede (Master, Escritório, Assessor)
        query = query.or(`responsible_id.eq.${userProfile.id},master_id.eq.${userProfile.id}`);
      } else if (isOfficeUser) {
        // Escritório vê investimentos de sua rede (Escritório, Assessor)
        query = query.or(`responsible_id.eq.${userProfile.id},office_id.eq.${userProfile.id}`);
      } else if (isAdvisorUser) {
        // Assessor vê apenas seus investimentos
        query = query.eq('responsible_id', userProfile.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Erro ao buscar investimentos:', error);
      alert('Erro ao carregar investimentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestorInvestments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          debentures(name),
          series(series_letter, commercial_name),
          responsible:users!investments_responsible_id_fkey(name, email)
        `)
        .eq('investor_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Erro ao buscar investimentos do investidor:', error);
      alert('Erro ao carregar seus investimentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchDebentures = async () => {
    try {
      const { data, error } = await supabase
        .from('debentures')
        .select('*')
        .eq('status', 'Ativa')
        .order('name');

      if (error) throw error;
      setDebentures(data || []);
    } catch (error) {
      console.error('Erro ao buscar debêntures:', error);
    }
  };

  const fetchSeriesByDebenture = async (debentureId: string) => {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('debenture_id', debentureId)
        .order('series_letter');

      if (error) throw error;
      setSeries(data || []);
    } catch (error) {
      console.error('Erro ao buscar séries:', error);
    }
  };

  const fetchNetworkUsers = async () => {
    try {
      let query = supabase.from('users').select('*');

      // Buscar usuários da rede baseado no tipo do usuário logado
      if (isGlobalUser) {
        // Global vê todos os usuários
        query = query.neq('user_type', 'Global');
      } else if (isMasterUser) {
        // Master vê sua rede (Escritório, Assessor, Investidor sob sua hierarquia)
        query = query.or(`hierarchical_superior.eq.${userProfile.id},id.eq.${userProfile.id}`);
      } else if (isOfficeUser) {
        // Escritório vê sua rede (Assessor, Investidor sob sua hierarquia)
        query = query.or(`hierarchical_superior.eq.${userProfile.id},id.eq.${userProfile.id}`);
      } else if (isAdvisorUser) {
        // Assessor vê apenas investidores sob sua hierarquia
        query = query.or(`hierarchical_superior.eq.${userProfile.id},id.eq.${userProfile.id}`);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setNetworkUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários da rede:', error);
    }
  };

  const handleDebentureChange = (debentureId: string) => {
    setFormData(prev => ({
      ...prev,
      debenture_id: debentureId,
      series_id: '' // Reset série quando muda debênture
    }));
    
    if (debentureId) {
      fetchSeriesByDebenture(debentureId);
    } else {
      setSeries([]);
    }
  };

  const handleSeriesChange = (seriesId: string) => {
    const selectedSeries = series.find(s => s.id === seriesId);
    setFormData(prev => ({
      ...prev,
      series_id: seriesId
    }));
  };

  const calculateMaturityDate = (seriesId: string): string => {
    const selectedSeries = series.find(s => s.id === seriesId);
    if (!selectedSeries) return '';

    const today = new Date();
    const maturityDate = new Date(today);
    maturityDate.setMonth(maturityDate.getMonth() + selectedSeries.term_months);
    
    return maturityDate.toISOString().split('T')[0];
  };

  const getSelectedSeriesInfo = () => {
    return series.find(s => s.id === formData.series_id);
  };

  const calculateTotalPercentage = (): number => {
    const master = parseFloat(formData.master_percentage) || 0;
    const office = parseFloat(formData.office_percentage) || 0;
    const advisor = parseFloat(formData.advisor_percentage) || 0;
    return master + office + advisor;
  };

  const isValidPercentage = (): boolean => {
    const selectedSeries = getSelectedSeriesInfo();
    if (!selectedSeries) return true;
    
    const total = calculateTotalPercentage();
    return total <= selectedSeries.max_commission_year;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPercentage()) {
      alert('O total dos percentuais não pode ultrapassar a comissão máxima da série');
      return;
    }

    try {
      const selectedSeries = getSelectedSeriesInfo();
      if (!selectedSeries) {
        alert('Selecione uma série válida');
        return;
      }

      const investmentData = {
        debenture_id: formData.debenture_id,
        series_id: formData.series_id,
        investor_id: formData.investor_id,
        responsible_id: userProfile.id,
        investment_date: new Date().toISOString().split('T')[0],
        maturity_date: calculateMaturityDate(formData.series_id),
        amount: parseFloat(formData.amount),
        annual_remuneration: selectedSeries.remuneration_year,
        monthly_remuneration: selectedSeries.remuneration_month,
        max_annual_commission: selectedSeries.max_commission_year,
        max_monthly_commission: selectedSeries.max_commission_month,
        master_id: formData.master_id || null,
        master_percentage: parseFloat(formData.master_percentage) || null,
        office_id: formData.office_id || null,
        office_percentage: parseFloat(formData.office_percentage) || null,
        advisor_id: formData.advisor_id || null,
        advisor_percentage: parseFloat(formData.advisor_percentage) || null,
        status: 'Ativo'
      };

      let result;
      if (editingInvestment) {
        result = await supabase
          .from('investments')
          .update(investmentData)
          .eq('id', editingInvestment.id);
      } else {
        result = await supabase
          .from('investments')
          .insert([investmentData]);
      }

      if (result.error) throw result.error;

      alert(editingInvestment ? 'Investimento atualizado com sucesso!' : 'Investimento criado com sucesso!');
      handleCancel();
      
      if (isInvestorUser) {
        fetchInvestorInvestments();
      } else {
        fetchInvestments();
      }
    } catch (error) {
      console.error('Erro ao salvar investimento:', error);
      alert('Erro ao salvar investimento');
    }
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setFormData({
      debenture_id: investment.debenture_id,
      series_id: investment.series_id,
      investor_id: investment.investor_id,
      amount: investment.amount.toString(),
      master_id: investment.master_id || '',
      master_percentage: investment.master_percentage?.toString() || '',
      office_id: investment.office_id || '',
      office_percentage: investment.office_percentage?.toString() || '',
      advisor_id: investment.advisor_id || '',
      advisor_percentage: investment.advisor_percentage?.toString() || ''
    });
    
    // Carregar séries da debênture
    if (investment.debenture_id) {
      fetchSeriesByDebenture(investment.debenture_id);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este investimento?')) return;

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Investimento deletado com sucesso!');
      
      if (isInvestorUser) {
        fetchInvestorInvestments();
      } else {
        fetchInvestments();
      }
    } catch (error) {
      console.error('Erro ao deletar investimento:', error);
      alert('Erro ao deletar investimento');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingInvestment(null);
    setFormData({
      debenture_id: '',
      series_id: '',
      investor_id: '',
      amount: '',
      master_id: '',
      master_percentage: '',
      office_id: '',
      office_percentage: '',
      advisor_id: '',
      advisor_percentage: ''
    });
    setSeries([]);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800';
      case 'Vencido':
        return 'bg-red-100 text-red-800';
      case 'Cancelado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getUsersByType = (userType: string) => {
    return networkUsers.filter(user => user.user_type === userType);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Investimentos</h1>
            <p className="text-gray-600">
              {isInvestorUser 
                ? 'Visualize seus investimentos'
                : 'Gerencie investimentos do sistema com controle hierárquico'
              }
            </p>
          </div>
          {canCreateInvestments && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Novo Investimento
            </button>
          )}
        </div>

        {/* Formulário de Investimento */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingInvestment ? 'Editar Investimento' : 'Novo Investimento'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Debênture */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Debênture *
                    </label>
                    <select
                      value={formData.debenture_id}
                      onChange={(e) => handleDebentureChange(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Selecione uma debênture</option>
                      {debentures.map((debenture) => (
                        <option key={debenture.id} value={debenture.id}>
                          {debenture.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Série */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Série *
                    </label>
                    <select
                      value={formData.series_id}
                      onChange={(e) => handleSeriesChange(e.target.value)}
                      required
                      disabled={!formData.debenture_id}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                    >
                      <option value="">Selecione uma série</option>
                      {series.map((serie) => (
                        <option key={serie.id} value={serie.id}>
                          Série {serie.series_letter} - {serie.commercial_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Investidor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Investidor *
                    </label>
                    <select
                      value={formData.investor_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, investor_id: e.target.value }))}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Selecione um investidor</option>
                      {getUsersByType('Investidor').map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Valor do Investimento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor do Investimento *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      placeholder="0,00"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                {/* Informações da Série Selecionada */}
                {getSelectedSeriesInfo() && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Informações da Série</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Prazo:</span>
                        <div className="font-medium">{getSelectedSeriesInfo()?.term_months} meses</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Remuneração/Ano:</span>
                        <div className="font-medium">{getSelectedSeriesInfo()?.remuneration_year}%</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Remuneração/Mês:</span>
                        <div className="font-medium">{getSelectedSeriesInfo()?.remuneration_month}%</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Comissão Máxima:</span>
                        <div className="font-medium">{getSelectedSeriesInfo()?.max_commission_year}%/ano</div>
                      </div>
                    </div>
                    {formData.series_id && (
                      <div className="mt-2">
                        <span className="text-gray-600">Vencimento:</span>
                        <div className="font-medium">{formatDate(calculateMaturityDate(formData.series_id))}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Split de Comissionamento */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-4">Split de Comissionamento</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Master */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Master</label>
                      <select
                        value={formData.master_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, master_id: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Selecione um Master</option>
                        {getUsersByType('Master').map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.master_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, master_percentage: e.target.value }))}
                        placeholder="Percentual (%)"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    {/* Escritório */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Escritório</label>
                      <select
                        value={formData.office_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, office_id: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Selecione um Escritório</option>
                        {getUsersByType('Escritório').map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.office_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, office_percentage: e.target.value }))}
                        placeholder="Percentual (%)"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    {/* Assessor */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Assessor</label>
                      <select
                        value={formData.advisor_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, advisor_id: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Selecione um Assessor</option>
                        {getUsersByType('Assessor').map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.advisor_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, advisor_percentage: e.target.value }))}
                        placeholder="Percentual (%)"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>

                  {/* Total dos Percentuais */}
                  <div className="mt-4 p-3 bg-gray-100 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total dos Percentuais:</span>
                      <span className={`font-bold ${isValidPercentage() ? 'text-green-600' : 'text-red-600'}`}>
                        {calculateTotalPercentage().toFixed(2)}%
                      </span>
                    </div>
                    {getSelectedSeriesInfo() && (
                      <div className="text-sm text-gray-600 mt-1">
                        Máximo permitido: {getSelectedSeriesInfo()?.max_commission_year}%
                      </div>
                    )}
                    {!isValidPercentage() && (
                      <div className="text-sm text-red-600 mt-1">
                        ⚠️ Total excede a comissão máxima da série
                      </div>
                    )}
                  </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!isValidPercentage()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {editingInvestment ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tabela de Investimentos */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Investimentos ({investments.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debênture/Série
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investidor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsável
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {canEditInvestments && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {investments.map((investment) => (
                  <tr key={investment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{investment.id.slice(-8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(investment as any).debentures?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Série {(investment as any).series?.series_letter} - {(investment as any).series?.commercial_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(investment as any).investor?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(investment as any).investor?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(investment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(investment.investment_date)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Venc: {formatDate(investment.maturity_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(investment as any).responsible?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(investment.status)}`}>
                        {investment.status}
                      </span>
                    </td>
                    {canEditInvestments && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(investment)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        {(isGlobalUser || investment.responsible_id === userProfile.id) && (
                          <button
                            onClick={() => handleDelete(investment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Deletar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {investments.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  {isInvestorUser 
                    ? 'Você ainda não possui investimentos cadastrados.'
                    : 'Nenhum investimento encontrado.'
                  }
                </div>
                {canCreateInvestments && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Criar Primeiro Investimento
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default InvestmentManagement;

