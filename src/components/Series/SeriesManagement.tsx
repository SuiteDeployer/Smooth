import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../Layout/AppLayout';
import toast from 'react-hot-toast';

interface Series {
  id: string;
  debenture_id: string;
  series_letter: string;
  commercial_name: string;
  term_months: number;
  max_commission_year: number;
  max_commission_month: number;
  captacao_amount: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface Debenture {
  id: string;
  name: string;
  total_amount: number;
  issuer: string;
  status: string;
}

const SeriesManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { debentureId } = useParams<{ debentureId: string }>();
  
  const [debenture, setDebenture] = useState<Debenture | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [formData, setFormData] = useState({
    series_letter: '',
    commercial_name: '',
    term_months: '',
    max_commission_year: '',
    captacao_amount: ''
  });

  // Verificar permissões de usuário
  const isGlobalUser = userProfile?.user_type === 'Global';
  const canViewSeries = ['Global', 'Master', 'Escritório', 'Head'].includes(userProfile?.user_type || '');
  
  // Redirecionar se não tiver permissão
  useEffect(() => {
    if (userProfile && !canViewSeries) {
      navigate('/dashboard');
      toast.error('Você não tem permissão para acessar esta área');
    }
  }, [userProfile, canViewSeries, navigate]);

  useEffect(() => {
    if (debentureId) {
      fetchDebenture();
      fetchSeries();
    }
  }, [debentureId]);

  const fetchDebenture = async () => {
    try {
      const { data, error } = await supabase
        .from('debentures')
        .select('*')
        .eq('id', debentureId)
        .single();

      if (error) throw error;
      setDebenture(data);
    } catch (error) {
      console.error('Erro ao buscar debênture:', error);
      toast.error('Erro ao carregar debênture');
      navigate('/debentures');
    }
  };

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('debenture_id', debentureId)
        .order('series_letter', { ascending: true });

      if (error) throw error;
      setSeries(data || []);
    } catch (error) {
      console.error('Erro ao buscar séries:', error);
      toast.error('Erro ao carregar séries');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCaptacao = () => {
    return series.reduce((total, s) => total + s.captacao_amount, 0);
  };

  const validateCaptacao = (newAmount: number, excludeId?: string) => {
    const currentTotal = series
      .filter(s => s.id !== excludeId)
      .reduce((total, s) => total + s.captacao_amount, 0);
    
    return (currentTotal + newAmount) <= (debenture?.total_amount || 0);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem criar séries');
      return;
    }

    const captacaoAmount = parseFloat(formData.captacao_amount.replace(/[^\d,]/g, '').replace(',', '.'));
    
    if (!validateCaptacao(captacaoAmount)) {
      toast.error('A soma das captações das séries não pode exceder a captação total da debênture');
      return;
    }

    try {
      const maxCommissionYear = parseFloat(formData.max_commission_year);
      
      const { error } = await supabase
        .from('series')
        .insert([{
          debenture_id: debentureId,
          series_letter: formData.series_letter,
          commercial_name: formData.commercial_name,
          term_months: parseInt(formData.term_months),
          max_commission_year: maxCommissionYear,
          max_commission_month: maxCommissionYear / 12,
          captacao_amount: captacaoAmount,
          created_by: userProfile?.id
        }]);

      if (error) throw error;

      toast.success('Série criada com sucesso!');
      setShowForm(false);
      resetForm();
      fetchSeries();
    } catch (error) {
      console.error('Erro ao criar série:', error);
      toast.error('Erro ao criar série');
    }
  };

  const handleEdit = (seriesItem: Series) => {
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem editar séries');
      return;
    }

    setEditingSeries(seriesItem);
    setFormData({
      series_letter: seriesItem.series_letter,
      commercial_name: seriesItem.commercial_name,
      term_months: seriesItem.term_months.toString(),
      max_commission_year: seriesItem.max_commission_year.toString(),
      captacao_amount: seriesItem.captacao_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSeries || !isGlobalUser) {
      toast.error('Apenas usuários Global podem editar séries');
      return;
    }

    const captacaoAmount = parseFloat(formData.captacao_amount.replace(/[^\d,]/g, '').replace(',', '.'));
    
    if (!validateCaptacao(captacaoAmount, editingSeries.id)) {
      toast.error('A soma das captações das séries não pode exceder a captação total da debênture');
      return;
    }

    try {
      const maxCommissionYear = parseFloat(formData.max_commission_year);
      
      const { error } = await supabase
        .from('series')
        .update({
          series_letter: formData.series_letter,
          commercial_name: formData.commercial_name,
          term_months: parseInt(formData.term_months),
          max_commission_year: maxCommissionYear,
          max_commission_month: maxCommissionYear / 12,
          captacao_amount: captacaoAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSeries.id);

      if (error) throw error;

      toast.success('Série atualizada com sucesso!');
      setShowForm(false);
      setEditingSeries(null);
      resetForm();
      fetchSeries();
    } catch (error) {
      console.error('Erro ao atualizar série:', error);
      toast.error('Erro ao atualizar série');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem deletar séries');
      return;
    }

    if (!confirm('Tem certeza que deseja deletar esta série?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('series')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Série deletada com sucesso!');
      fetchSeries();
    } catch (error) {
      console.error('Erro ao deletar série:', error);
      toast.error('Erro ao deletar série');
    }
  };

  const resetForm = () => {
    setFormData({
      series_letter: '',
      commercial_name: '',
      term_months: '',
      max_commission_year: '',
      captacao_amount: ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSeries(null);
    resetForm();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Carregando séries...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-2">
        {/* Breadcrumb */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/debentures')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Voltar para Debêntures
          </button>
        </div>

        {/* Header da debênture */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Séries da Debênture</h1>
          <div className="mt-2 bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900">{debenture?.name}</h2>
            <p className="text-blue-700">
              Captação Total: {formatCurrency(debenture?.total_amount || 0)} | 
              Captação Utilizada: {formatCurrency(calculateTotalCaptacao())} | 
              Disponível: {formatCurrency((debenture?.total_amount || 0) - calculateTotalCaptacao())}
            </p>
          </div>
          <p className="text-gray-600 mt-2">
            {isGlobalUser 
              ? 'Gerencie as séries desta debênture' 
              : 'Visualize as séries desta debênture (somente leitura)'
            }
          </p>
        </div>

        {/* Header com botão */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Séries ({series.length})</h2>
          {isGlobalUser && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Nova Série
            </button>
          )}
        </div>

        {/* Tabela de séries */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Série
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome Comercial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prazo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comissão (Ano/Mês)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Captação
                </th>
                {isGlobalUser && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {series.map((seriesItem) => (
                <tr key={seriesItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{seriesItem.series_letter}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{seriesItem.commercial_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{seriesItem.term_months} meses</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatPercentage(seriesItem.max_commission_year)} / {formatPercentage(seriesItem.max_commission_month)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(seriesItem.captacao_amount)}</div>
                  </td>
                  {isGlobalUser && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(seriesItem)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(seriesItem.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deletar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {series.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">Nenhuma série encontrada</div>
              {isGlobalUser && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Criar primeira série
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal de formulário */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingSeries ? 'Editar Série' : 'Nova Série'}
              </h2>
              
              <form onSubmit={editingSeries ? handleUpdate : handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Série
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.series_letter}
                      onChange={(e) => setFormData({...formData, series_letter: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Comercial
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.commercial_name}
                      onChange={(e) => setFormData({...formData, commercial_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: Otmow 12 meses"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prazo (meses)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.term_months}
                      onChange={(e) => setFormData({...formData, term_months: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Percentual Máximo ao Ano (%)
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.max_commission_year}
                      onChange={(e) => setFormData({...formData, max_commission_year: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="8.00"
                    />
                    {formData.max_commission_year && (
                      <p className="text-xs text-gray-500 mt-1">
                        Percentual ao mês: {(parseFloat(formData.max_commission_year) / 12).toFixed(2)}%
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Captação da Série
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.captacao_amount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const formatted = (parseInt(value) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        setFormData({...formData, captacao_amount: formatted});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="500.000,00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Disponível: {formatCurrency((debenture?.total_amount || 0) - calculateTotalCaptacao())}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                  >
                    {editingSeries ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SeriesManagement;

