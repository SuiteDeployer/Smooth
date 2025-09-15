import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../Layout/AppLayout';
import toast from 'react-hot-toast';

interface Debenture {
  id: string;
  name: string;
  total_amount: number;
  issuer: string;
  status: 'Ativa' | 'Inativa' | 'Finalizada';
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface Serie {
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
  created_at: string;
  updated_at: string;
  created_by: string;
  // Propriedades calculadas
  current_captation?: number;
  captation_percentage?: number;
}

const DebentureManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [debentures, setDebentures] = useState<Debenture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [series, setSeries] = useState<Serie[]>([]);
  const [editingDebenture, setEditingDebenture] = useState<Debenture | null>(null);
  const [editingSeries, setEditingSeries] = useState<Serie | null>(null);
  const [selectedDebentureId, setSelectedDebentureId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    total_amount: '',
    issuer: '',
    status: 'Ativa' as Debenture['status']
  });

  const [seriesFormData, setSeriesFormData] = useState({
    series_letter: '',
    commercial_name: '',
    term_months: '',
    captacao_amount: '',
    max_commission_year: '',
    max_commission_month: '', // Campo calculado automaticamente
    remuneration_year: '',
    remuneration_month: '' // Campo calculado automaticamente
  });

  // Verificar permissões de usuário
  const isGlobalUser = userProfile?.user_type === 'Global';
  const canViewDebentures = ['Global', 'Master', 'Escritório', 'Assessor'].includes(userProfile?.user_type || '');
  
  // Redirecionar Investidores
  useEffect(() => {
    if (userProfile && !canViewDebentures) {
      navigate('/dashboard');
      toast.error('Você não tem permissão para acessar esta área');
    }
  }, [userProfile, canViewDebentures, navigate]);

  useEffect(() => {
    fetchDebentures();
  }, []);

  useEffect(() => {
    // Buscar séries para todas as debêntures quando elas carregam
    if (debentures.length > 0) {
      const fetchAllSeries = async () => {
        try {
          const { data, error } = await supabase
            .from('series')
            .select('*')
            .order('series_letter', { ascending: true });

          if (error) throw error;
          setSeries(data || []);
        } catch (error) {
          console.error('Erro ao buscar todas as séries:', error);
        }
      };
      fetchAllSeries();
    }
  }, [debentures]);

  // Função para calcular valores mensais automaticamente
  const calculateMonthlyValues = (yearValue: string) => {
    const numericValue = parseFloat(yearValue);
    if (isNaN(numericValue) || numericValue === 0) {
      return '';
    }
    return (numericValue / 12).toFixed(2);
  };

  // Handler para mudança na comissão anual
  const handleCommissionYearChange = (value: string) => {
    const monthValue = calculateMonthlyValues(value);
    setSeriesFormData({
      ...seriesFormData,
      max_commission_year: value,
      max_commission_month: monthValue
    });
  };

  // Handler para mudança na remuneração anual
  const handleRemunerationYearChange = (value: string) => {
    const monthValue = calculateMonthlyValues(value);
    setSeriesFormData({
      ...seriesFormData,
      remuneration_year: value,
      remuneration_month: monthValue
    });
  };

  const fetchDebentures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('debentures')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDebentures(data || []);
    } catch (error) {
      console.error('Erro ao buscar debêntures:', error);
      toast.error('Erro ao carregar debêntures');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeries = async (debentureId: string) => {
    try {
      const [seriesResponse, investmentsResponse] = await Promise.all([
        supabase
          .from('series')
          .select('*')
          .eq('debenture_id', debentureId)
          .order('series_letter', { ascending: true }),
        supabase
          .from('investments')
          .select('series_id, investment_amount, status')
          .eq('debenture_id', debentureId)
          .eq('status', 'active')
      ]);

      if (seriesResponse.error) throw seriesResponse.error;
      if (investmentsResponse.error) throw investmentsResponse.error;

      // Calcular captação por série
      const investments = investmentsResponse.data || [];
      console.log('🔍 DEBUG - Investments found:', investments);
      console.log('🔍 DEBUG - Debenture ID:', debentureId);
      
      const captationBySeries = {};

      investments.forEach(investment => {
        console.log('🔍 DEBUG - Processing investment:', investment);
        const amount = parseFloat(investment.investment_amount) || 0;
        if (investment.series_id) {
          captationBySeries[investment.series_id] = (captationBySeries[investment.series_id] || 0) + amount;
        }
      });

      console.log('🔍 DEBUG - Captation by series:', captationBySeries);

      // Adicionar captação calculada às séries
      const seriesWithCaptation = (seriesResponse.data || []).map(serie => ({
        ...serie,
        current_captation: captationBySeries[serie.id] || 0,
        captation_percentage: serie.captacao_amount > 0 ? 
          ((captationBySeries[serie.id] || 0) / serie.captacao_amount) * 100 : 0
      }));

      setSeries(seriesWithCaptation);
    } catch (error) {
      console.error('Erro ao buscar séries:', error);
      toast.error('Erro ao carregar séries');
    }
  };

  const calculateSeriesTotal = (debentureId: string) => {
    return series
      .filter(s => s.debenture_id === debentureId)
      .reduce((total, s) => total + s.captacao_amount, 0);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem criar debêntures');
      return;
    }

    try {
      const debentureData = {
        name: formData.name,
        total_amount: parseFloat(formData.total_amount.replace(/[^\d,]/g, '').replace(',', '.')),
        issuer: formData.issuer,
        status: formData.status,
        created_by: userProfile?.id
      };
      
      console.log('Dados da debênture a serem inseridos:', debentureData);
      console.log('UserProfile:', userProfile);

      const { data, error } = await supabase
        .from('debentures')
        .insert([debentureData])
        .select();

      if (error) {
        console.error('Erro detalhado ao criar debênture:', error);
        console.error('Código do erro:', error.code);
        console.error('Mensagem do erro:', error.message);
        console.error('Detalhes do erro:', error.details);
        throw error;
      }

      console.log('Debênture criada com sucesso:', data);

      toast.success('Debênture criada com sucesso!');
      setShowForm(false);
      resetForm();
      fetchDebentures();
    } catch (error) {
      console.error('Erro ao criar debênture:', error);
      toast.error('Erro ao criar debênture');
    }
  };

  const handleEdit = (debenture: Debenture) => {
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem editar debêntures');
      return;
    }

    setEditingDebenture(debenture);
    setFormData({
      name: debenture.name,
      total_amount: debenture.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      issuer: debenture.issuer,
      status: debenture.status
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDebenture || !isGlobalUser) {
      toast.error('Apenas usuários Global podem editar debêntures');
      return;
    }

    try {
      const { error } = await supabase
        .from('debentures')
        .update({
          name: formData.name,
          total_amount: parseFloat(formData.total_amount.replace(/[^\d,]/g, '').replace(',', '.')),
          issuer: formData.issuer,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingDebenture.id);

      if (error) throw error;

      toast.success('Debênture atualizada com sucesso!');
      setShowForm(false);
      setEditingDebenture(null);
      resetForm();
      fetchDebentures();
    } catch (error) {
      console.error('Erro ao atualizar debênture:', error);
      toast.error('Erro ao atualizar debênture');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem deletar debêntures');
      return;
    }

    if (!confirm('Tem certeza que deseja deletar esta debênture?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('debentures')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Debênture deletada com sucesso!');
      fetchDebentures();
    } catch (error) {
      console.error('Erro ao deletar debênture:', error);
      toast.error('Erro ao deletar debênture');
    }
  };

  // Funções para séries
  const handleCreateSeries = (debentureId: string) => {
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem criar séries');
      return;
    }
    
    console.log('🚀 Abrindo modal para criar série para debênture:', debentureId);
    setSelectedDebentureId(debentureId);
    setEditingSeries(null);
    resetSeriesForm();
    setShowSeriesForm(true);
  };

  const handleEditSeries = (serie: Serie) => {
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem editar séries');
      return;
    }

    console.log('🔧 Editando série:', serie);
    setEditingSeries(serie);
    setSelectedDebentureId(serie.debenture_id);
    
    // Calcular valores mensais ao carregar dados para edição
    const commissionMonth = calculateMonthlyValues(String(serie.max_commission_year || ''));
    const remunerationMonth = calculateMonthlyValues(String(serie.remuneration_year || ''));
    
    setSeriesFormData({
      series_letter: serie.series_letter || '',
      commercial_name: serie.commercial_name || '',
      term_months: String(serie.term_months || ''),
      captacao_amount: String(serie.captacao_amount || ''),
      max_commission_year: String(serie.max_commission_year || ''),
      max_commission_month: commissionMonth,
      remuneration_year: String(serie.remuneration_year || ''),
      remuneration_month: remunerationMonth
    });
    setShowSeriesForm(true);
  };

  const handleDeleteSeries = async (serie: Serie) => {
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem deletar séries');
      return;
    }

    if (!confirm(`Tem certeza que deseja deletar a série ${serie.series_letter}?`)) {
      return;
    }

    console.log('🗑️ Deletando série:', serie);

    try {
      const { error } = await supabase
        .from('series')
        .delete()
        .eq('id', serie.id);

      if (error) throw error;

      toast.success('Série deletada com sucesso!');
      
      // Recarregar séries
      const { data, error: fetchError } = await supabase
        .from('series')
        .select('*')
        .order('series_letter', { ascending: true });

      if (!fetchError) {
        setSeries(data || []);
      }
    } catch (error) {
      console.error('Erro ao deletar série:', error);
      toast.error('Erro ao deletar série');
    }
  };

  const handleSeriesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem gerenciar séries');
      return;
    }

    try {
      const seriesData = {
        debenture_id: selectedDebentureId,
        series_letter: seriesFormData.series_letter,
        commercial_name: seriesFormData.commercial_name,
        term_months: parseInt(seriesFormData.term_months) || 0,
        captacao_amount: parseFloat(seriesFormData.captacao_amount) || 0,
        max_commission_year: parseFloat(seriesFormData.max_commission_year) || 0,
        max_commission_month: parseFloat(seriesFormData.max_commission_month) || 0,
        remuneration_year: parseFloat(seriesFormData.remuneration_year) || 0,
        remuneration_month: parseFloat(seriesFormData.remuneration_month) || 0,
        created_by: userProfile?.id
      };

      if (editingSeries) {
        // Atualizar série existente
        const { error } = await supabase
          .from('series')
          .update(seriesData)
          .eq('id', editingSeries.id);

        if (error) throw error;
        toast.success('Série atualizada com sucesso!');
      } else {
        // Criar nova série
        const { error } = await supabase
          .from('series')
          .insert([seriesData]);

        if (error) throw error;
        toast.success('Série criada com sucesso!');
      }

      setShowSeriesForm(false);
      setEditingSeries(null);
      resetSeriesForm();
      
      // Recarregar séries
      const { data, error: fetchError } = await supabase
        .from('series')
        .select('*')
        .order('series_letter', { ascending: true });

      if (!fetchError) {
        setSeries(data || []);
      }
    } catch (error) {
      console.error('Erro ao salvar série:', error);
      toast.error('Erro ao salvar série');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      total_amount: '',
      issuer: '',
      status: 'Ativa'
    });
  };

  const resetSeriesForm = () => {
    setSeriesFormData({
      series_letter: '',
      commercial_name: '',
      term_months: '',
      captacao_amount: '',
      max_commission_year: '',
      max_commission_month: '',
      remuneration_year: '',
      remuneration_month: ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDebenture(null);
    resetForm();
  };

  const handleSeriesCancel = () => {
    setShowSeriesForm(false);
    setEditingSeries(null);
    resetSeriesForm();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Debêntures</h1>
            <p className="text-gray-600">Gerencie debêntures do sistema</p>
          </div>
          {isGlobalUser && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Nova Debênture
            </button>
          )}
        </div>

        {/* Tabela de Debêntures */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Debêntures ({debentures.length})</h2>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Captação Total</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Captação Utilizada</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disponível</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Emitente</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data de Criação</th>
                {isGlobalUser && (
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {debentures.map((debenture) => {
                const seriesTotal = calculateSeriesTotal(debenture.id);
                const available = debenture.total_amount - seriesTotal;
                const debenturesSeries = series.filter(s => s.debenture_id === debenture.id);
                
                return (
                <React.Fragment key={debenture.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {debenture.name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(debenture.total_amount)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(seriesTotal)}</td>
                    <td className="px-4 py-2 text-sm text-green-600">{formatCurrency(available)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{debenture.issuer}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        debenture.status === 'Ativa' ? 'bg-green-100 text-green-800' :
                        debenture.status === 'Inativa' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {debenture.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{formatDate(debenture.created_at)}</td>
                    {isGlobalUser && (
                      <td className="px-4 py-2 text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(debenture)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(debenture.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Deletar
                        </button>
                      </td>
                    )}
                  </tr>
                  
                  {/* Área de séries sempre visível */}
                  <tr>
                    <td colSpan={isGlobalUser ? 8 : 7} className="px-4 py-4 bg-gray-50">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-medium text-gray-900">
                            Séries da {debenture.name}
                          </h4>
                          {isGlobalUser && (
                            <button
                              onClick={() => handleCreateSeries(debenture.id)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                            >
                              Nova Série
                            </button>
                          )}
                        </div>
                          
                          {debenturesSeries.length > 0 ? (
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Série</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome Comercial</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prazo</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Captação</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Progresso</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Comissão/Ano</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remuneração/Ano</th>
                                    {isGlobalUser && (
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {debenturesSeries.map((serie) => (
                                    <tr key={serie.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{serie.series_letter}</td>
                                      <td className="px-4 py-2 text-sm text-gray-900">{serie.commercial_name}</td>
                                      <td className="px-4 py-2 text-sm text-gray-900">{serie.term_months} meses</td>
                                      <td className="px-4 py-2 text-sm">
                                        <div className="space-y-1">
                                          <div className="text-xs">
                                            <span className="font-medium text-green-700">
                                              Captado: {formatCurrency(serie.current_captation || 0)}
                                            </span>
                                          </div>
                                          <div className="text-xs">
                                            <span className="font-medium text-blue-700">
                                              Disponível: {formatCurrency((serie.captacao_amount || 0) - (serie.current_captation || 0))}
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            Limite: {formatCurrency(serie.captacao_amount)}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-sm">
                                        {(() => {
                                          const captado = serie.current_captation || 0;
                                          const limite = serie.captacao_amount || 0;
                                          const percentual = limite > 0 ? (captado / limite) * 100 : 0;
                                          
                                          let barColor = 'bg-green-500';
                                          let bgColor = 'bg-green-50';
                                          let textColor = 'text-green-700';
                                          let status = 'Disponível';
                                          
                                          if (percentual >= 100) {
                                            barColor = 'bg-red-500';
                                            bgColor = 'bg-red-50';
                                            textColor = 'text-red-700';
                                            status = 'Esgotada';
                                          } else if (percentual >= 80) {
                                            barColor = 'bg-yellow-500';
                                            bgColor = 'bg-yellow-50';
                                            textColor = 'text-yellow-700';
                                            status = 'Quase Esgotada';
                                          }
                                          
                                          return (
                                            <div className="space-y-2">
                                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
                                                {status}
                                              </div>
                                              <div className="w-full">
                                                <div className="flex justify-between text-xs mb-1">
                                                  <span className="font-medium">{percentual.toFixed(1)}%</span>
                                                </div>
                                                <div className="bg-gray-200 rounded-full h-2">
                                                  <div 
                                                    className={`${barColor} h-2 rounded-full transition-all duration-300`}
                                                    style={{ width: `${Math.min(percentual, 100)}%` }}
                                                  ></div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900">{serie.max_commission_year}%</td>
                                      <td className="px-4 py-2 text-sm text-gray-900">{serie.remuneration_year}%</td>
                                      {isGlobalUser && (
                                        <td className="px-4 py-2 text-sm font-medium space-x-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditSeries(serie);
                                            }}
                                            className="text-blue-600 hover:text-blue-900"
                                          >
                                            Editar
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteSeries(serie);
                                            }}
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
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <p>Nenhuma série cadastrada para esta debênture.</p>
                              {isGlobalUser && (
                                <p className="mt-2">Clique em "Nova Série" para adicionar a primeira série.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {debentures.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">Nenhuma debênture encontrada</div>
              {isGlobalUser && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Criar primeira debênture
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal de formulário de debênture */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingDebenture ? 'Editar Debênture' : 'Nova Debênture'}
              </h2>
              
              <form onSubmit={editingDebenture ? handleUpdate : handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Debênture
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Debênture Ótmow 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Captação Total
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.total_amount}
                    onChange={(e) => {
                      // Formatar como moeda brasileira
                      const value = e.target.value.replace(/\D/g, '');
                      const formatted = (parseInt(value) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                      setFormData({...formData, total_amount: formatted});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2.000.000,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emitente
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.issuer}
                    onChange={(e) => setFormData({...formData, issuer: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Conta Global"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as Debenture['status']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                    <option value="finished">Finalizada</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                  >
                    {editingDebenture ? 'Atualizar' : 'Criar'}
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

        {/* Modal de formulário de série */}
        {showSeriesForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingSeries ? 'Editar Série' : 'Nova Série'}
              </h2>
              
              <form onSubmit={handleSeriesSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Letra da Série
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={1}
                      value={seriesFormData.series_letter}
                      onChange={(e) => setSeriesFormData({...seriesFormData, series_letter: e.target.value.toUpperCase()})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="A"
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
                      value={seriesFormData.term_months}
                      onChange={(e) => setSeriesFormData({...seriesFormData, term_months: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Comercial
                  </label>
                  <input
                    type="text"
                    required
                    value={seriesFormData.commercial_name}
                    onChange={(e) => setSeriesFormData({...seriesFormData, commercial_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Otmow 12 meses"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor de Captação
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={seriesFormData.captacao_amount}
                    onChange={(e) => setSeriesFormData({...seriesFormData, captacao_amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000000"
                  />
                </div>

                {/* Seção de Comissão com cálculo automático */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 mb-3">Comissão Máxima</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Por Ano (%)
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={seriesFormData.max_commission_year}
                        onChange={(e) => handleCommissionYearChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Por Mês (%) <span className="text-blue-600 text-xs">- Calculado automaticamente</span>
                      </label>
                      <input
                        type="text"
                        value={seriesFormData.max_commission_month}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                        placeholder="1.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção de Remuneração com cálculo automático */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-900 mb-3">Remuneração</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Por Ano (%)
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={seriesFormData.remuneration_year}
                        onChange={(e) => handleRemunerationYearChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="24"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Por Mês (%) <span className="text-green-600 text-xs">- Calculado automaticamente</span>
                      </label>
                      <input
                        type="text"
                        value={seriesFormData.remuneration_month}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                        placeholder="2.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                  >
                    {editingSeries ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSeriesCancel}
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

export default DebentureManagement;

