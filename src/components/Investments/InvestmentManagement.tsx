import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../Layout/AppLayout';

interface Investment {
  id: number;
  debenture_id: string;
  series_id: string;
  investor_id: string;
  assessor_id: string;
  escritorio_id: string;
  master_id: string;
  investment_amount: number;
  investment_date: string;
  maturity_date: string;
  assessor_commission_percentage: number;
  escritorio_commission_percentage: number;
  master_commission_percentage: number;
  assessor_commission_amount: number;
  escritorio_commission_amount: number;
  master_commission_amount: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Debenture {
  id: string;
  name: string;
  total_amount: number;
  issuer: string;
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
  email: string;
  full_name: string;
  user_type: 'Global' | 'Master' | 'Escritório' | 'Assessor' | 'Investidor';
  master_id?: string;
  escritorio_id?: string;
}

const InvestmentManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for form data
  const [formData, setFormData] = useState({
    debenture_id: '',
    series_id: '',
    investor_id: '',
    assessor_id: '',
    escritorio_id: '',
    master_id: '',
    investment_amount: '',
    assessor_commission_percentage: '',
    escritorio_commission_percentage: '',
    master_commission_percentage: '',
    notes: ''
  });

  // State for dropdowns data
  const [debentures, setDebentures] = useState<Debenture[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [investors, setInvestors] = useState<User[]>([]);
  const [masters, setMasters] = useState<User[]>([]);
  const [escritorios, setEscritorios] = useState<User[]>([]);
  const [assessors, setAssessors] = useState<User[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  
  // State for selected series info
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  
  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load current user data
  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        setCurrentUser(data);
      } catch (err) {
        console.error('Error loading current user:', err);
      }
    };
    
    loadCurrentUser();
  }, [user]);

  // Load debentures
  useEffect(() => {
    const loadDebentures = async () => {
      try {
        const { data, error } = await supabase
          .from('debentures')
          .select('*')
          .eq('status', 'Ativa')
          .order('name');
          
        if (error) throw error;
        setDebentures(data || []);
      } catch (err) {
        console.error('Error loading debentures:', err);
      }
    };
    
    loadDebentures();
  }, []);

  // Load series when debenture is selected
  useEffect(() => {
    const loadSeries = async () => {
      if (!formData.debenture_id) {
        setSeries([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('series')
          .select('*')
          .eq('debenture_id', formData.debenture_id)
          .order('series_letter');
          
        if (error) throw error;
        setSeries(data || []);
      } catch (err) {
        console.error('Error loading series:', err);
      }
    };
    
    loadSeries();
  }, [formData.debenture_id]);

  // Load network users based on current user type
  useEffect(() => {
    const loadNetworkUsers = async () => {
      if (!currentUser) return;
      
      try {
        let query = supabase.from('users').select('*');
        
        // Load users based on current user's permissions
        switch (currentUser.user_type) {
          case 'Global':
            // Global can see all users
            break;
          case 'Master':
            // Master can see their network
            query = query.or(`master_id.eq.${currentUser.id},id.eq.${currentUser.id},escritorio_id.in.(select id from users where master_id = '${currentUser.id}')`);
            break;
          case 'Escritório':
            // Escritório can see their office network
            query = query.or(`escritorio_id.eq.${currentUser.id},id.eq.${currentUser.id}`);
            break;
          case 'Assessor':
            // Assessor can see themselves and investors
            query = query.or(`id.eq.${currentUser.id},user_type.eq.Investidor`);
            break;
          default:
            return;
        }
        
        const { data, error } = await query.order('full_name');
        if (error) throw error;
        
        const users = data || [];
        
        // Separate users by type
        setInvestors(users.filter(u => u.user_type === 'Investidor'));
        setMasters(users.filter(u => u.user_type === 'Master'));
        setEscritorios(users.filter(u => u.user_type === 'Escritório'));
        setAssessors(users.filter(u => u.user_type === 'Assessor'));
        
      } catch (err) {
        console.error('Error loading network users:', err);
      }
    };
    
    loadNetworkUsers();
  }, [currentUser]);

  // Load investments
  useEffect(() => {
    const loadInvestments = async () => {
      try {
        const { data, error } = await supabase
          .from('investments')
          .select(`
            *,
            debentures(name),
            series(series_letter, commercial_name),
            investor:users!investments_investor_id_fkey(full_name),
            assessor:users!investments_assessor_id_fkey(full_name),
            escritorio:users!investments_escritorio_id_fkey(full_name),
            master:users!investments_master_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setInvestments(data || []);
      } catch (err) {
        console.error('Error loading investments:', err);
      }
    };
    
    loadInvestments();
  }, []);

  // Handle series selection
  const handleSeriesChange = (seriesId: string) => {
    const selected = series.find(s => s.id === seriesId);
    setSelectedSeries(selected || null);
    setFormData(prev => ({ ...prev, series_id: seriesId }));
  };

  // Calculate maturity date
  const calculateMaturityDate = () => {
    if (!selectedSeries) return '';
    
    const today = new Date();
    const maturityDate = new Date(today);
    maturityDate.setMonth(maturityDate.getMonth() + selectedSeries.term_months);
    
    return maturityDate.toISOString().split('T')[0];
  };

  // Validate commission split
  const validateCommissionSplit = () => {
    const assessor = parseFloat(formData.assessor_commission_percentage) || 0;
    const escritorio = parseFloat(formData.escritorio_commission_percentage) || 0;
    const master = parseFloat(formData.master_commission_percentage) || 0;
    
    const total = assessor + escritorio + master;
    
    if (total > 100) {
      setError('O total dos percentuais de comissão não pode ultrapassar 100%');
      return false;
    }
    
    if (selectedSeries) {
      const maxCommission = selectedSeries.max_commission_year;
      if (total > maxCommission) {
        setError(`O total dos percentuais de comissão não pode ultrapassar ${maxCommission}% (máximo da série)`);
        return false;
      }
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCommissionSplit()) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const investmentData = {
        debenture_id: formData.debenture_id,
        series_id: formData.series_id,
        investor_id: formData.investor_id,
        assessor_id: formData.assessor_id,
        escritorio_id: formData.escritorio_id,
        master_id: formData.master_id,
        investment_amount: parseFloat(formData.investment_amount),
        investment_date: new Date().toISOString().split('T')[0],
        maturity_date: calculateMaturityDate(),
        assessor_commission_percentage: parseFloat(formData.assessor_commission_percentage) || 0,
        escritorio_commission_percentage: parseFloat(formData.escritorio_commission_percentage) || 0,
        master_commission_percentage: parseFloat(formData.master_commission_percentage) || 0,
        notes: formData.notes,
        created_by: user?.id,
        updated_by: user?.id
      };
      
      const { error } = await supabase
        .from('investments')
        .insert([investmentData]);
        
      if (error) throw error;
      
      setSuccess('Investimento criado com sucesso!');
      
      // Reset form
      setFormData({
        debenture_id: '',
        series_id: '',
        investor_id: '',
        assessor_id: '',
        escritorio_id: '',
        master_id: '',
        investment_amount: '',
        assessor_commission_percentage: '',
        escritorio_commission_percentage: '',
        master_commission_percentage: '',
        notes: ''
      });
      setSelectedSeries(null);
      
      // Reload investments
      const { data } = await supabase
        .from('investments')
        .select(`
          *,
          debentures(name),
          series(series_letter, commercial_name),
          investor:users!investments_investor_id_fkey(full_name),
          assessor:users!investments_assessor_id_fkey(full_name),
          escritorio:users!investments_escritorio_id_fkey(full_name),
          master:users!investments_master_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });
      setInvestments(data || []);
      
    } catch (err: any) {
      setError(err.message || 'Erro ao criar investimento');
    } finally {
      setLoading(false);
    }
  };

  // Calculate commission total
  const getCommissionTotal = () => {
    const assessor = parseFloat(formData.assessor_commission_percentage) || 0;
    const escritorio = parseFloat(formData.escritorio_commission_percentage) || 0;
    const master = parseFloat(formData.master_commission_percentage) || 0;
    return assessor + escritorio + master;
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Investimentos</h1>
          <p className="mt-2 text-gray-600">Crie e gerencie investimentos em debêntures</p>
        </div>

        {/* Create Investment Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Criar Novo Investimento</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-600">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Debenture Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Debênture *
                </label>
                <select
                  value={formData.debenture_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, debenture_id: e.target.value, series_id: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione uma debênture</option>
                  {debentures.map(debenture => (
                    <option key={debenture.id} value={debenture.id}>
                      {debenture.name} - {debenture.issuer}
                    </option>
                  ))}
                </select>
              </div>

              {/* Series Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Série *
                </label>
                <select
                  value={formData.series_id}
                  onChange={(e) => handleSeriesChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!formData.debenture_id}
                >
                  <option value="">Selecione uma série</option>
                  {series.map(serie => (
                    <option key={serie.id} value={serie.id}>
                      Série {serie.series_letter} - {serie.commercial_name} ({serie.term_months} meses)
                    </option>
                  ))}
                </select>
              </div>

              {/* Investment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor do Investimento (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.investment_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, investment_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Investor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Investidor *
                </label>
                <select
                  value={formData.investor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, investor_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione um investidor</option>
                  {investors.map(investor => (
                    <option key={investor.id} value={investor.id}>
                      {investor.full_name} ({investor.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Series Information Display */}
            {selectedSeries && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Informações da Série</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Prazo:</span>
                    <p>{selectedSeries.term_months} meses</p>
                  </div>
                  <div>
                    <span className="font-medium">Remuneração ao Ano:</span>
                    <p>{selectedSeries.remuneration_year}%</p>
                  </div>
                  <div>
                    <span className="font-medium">Remuneração ao Mês:</span>
                    <p>{selectedSeries.remuneration_month}%</p>
                  </div>
                  <div>
                    <span className="font-medium">Comissão Máxima ao Ano:</span>
                    <p>{selectedSeries.max_commission_year}%</p>
                  </div>
                  <div>
                    <span className="font-medium">Comissão Máxima ao Mês:</span>
                    <p>{selectedSeries.max_commission_month}%</p>
                  </div>
                  <div>
                    <span className="font-medium">Data de Vencimento:</span>
                    <p>{calculateMaturityDate()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Commission Split */}
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Split de Comissionamento</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Master */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Master
                  </label>
                  <select
                    value={formData.master_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, master_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    required
                  >
                    <option value="">Selecione um master</option>
                    {masters.map(master => (
                      <option key={master.id} value={master.id}>
                        {master.full_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Percentual (%)"
                    value={formData.master_commission_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, master_commission_percentage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Escritório */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escritório
                  </label>
                  <select
                    value={formData.escritorio_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, escritorio_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    required
                  >
                    <option value="">Selecione um escritório</option>
                    {escritorios.map(escritorio => (
                      <option key={escritorio.id} value={escritorio.id}>
                        {escritorio.full_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Percentual (%)"
                    value={formData.escritorio_commission_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, escritorio_commission_percentage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Assessor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assessor
                  </label>
                  <select
                    value={formData.assessor_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, assessor_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    required
                  >
                    <option value="">Selecione um assessor</option>
                    {assessors.map(assessor => (
                      <option key={assessor.id} value={assessor.id}>
                        {assessor.full_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Percentual (%)"
                    value={formData.assessor_commission_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, assessor_commission_percentage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Commission Total */}
              <div className="mt-4 p-3 bg-white rounded border">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total dos Percentuais:</span>
                  <span className={`font-bold ${getCommissionTotal() > 100 ? 'text-red-600' : getCommissionTotal() > (selectedSeries?.max_commission_year || 100) ? 'text-orange-600' : 'text-green-600'}`}>
                    {getCommissionTotal().toFixed(2)}%
                  </span>
                </div>
                {selectedSeries && (
                  <div className="text-sm text-gray-600 mt-1">
                    Máximo permitido pela série: {selectedSeries.max_commission_year}%
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observações adicionais sobre o investimento..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || getCommissionTotal() > 100 || (selectedSeries && getCommissionTotal() > selectedSeries.max_commission_year)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando...' : 'Criar Investimento'}
              </button>
            </div>
          </form>
        </div>

        {/* Investments List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Investimentos Criados</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debênture</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Série</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investidor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {investments.map((investment: any) => (
                  <tr key={investment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{investment.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {investment.debentures?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {investment.series?.series_letter} - {investment.series?.commercial_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {investment.investor?.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {investment.investment_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(investment.investment_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(investment.maturity_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        investment.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : investment.status === 'matured'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {investment.status === 'active' ? 'Ativo' : 
                         investment.status === 'matured' ? 'Vencido' : 'Cancelado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {investments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum investimento encontrado
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default InvestmentManagement;

