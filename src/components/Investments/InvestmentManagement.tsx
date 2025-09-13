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
  name: string;
  full_name?: string; // Alias for name for compatibility
  user_type: 'Global' | 'Master' | 'Escritório' | 'Assessor' | 'Investidor';
  parent_id: string | null;
  phone: string | null;
  document: string | null;
  cpf?: string | null;
  pix?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  master_id?: string;
  escritorio_id?: string;
  assessor_id?: string;
}

const InvestmentManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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

  // Handle debenture selection
  const handleDebentureChange = async (debentureId: string) => {
    setFormData(prev => ({ ...prev, debenture_id: debentureId, series_id: '' }));
    setSelectedSeries(null);
    
    if (debentureId) {
      try {
        const { data, error } = await supabase
          .from('series')
          .select('*')
          .eq('debenture_id', debentureId)
          .order('series_letter');
          
        if (error) throw error;
        setSeries(data || []);
      } catch (err) {
        console.error('Error loading series:', err);
      }
    } else {
      setSeries([]);
    }
  };

  // Load commission users based on current user hierarchy
  useEffect(() => {
    const loadCommissionUsers = async () => {
      if (!currentUser) return;
      
      try {
        console.log('Loading commission users for:', currentUser.user_type, currentUser.email);
        
        // Load all commission users (non-investors)
        const { data: allUsers, error } = await supabase
          .from('users')
          .select('*')
          .neq('user_type', 'Investidor')
          .order('name');
          
        if (error) throw error;
        
        console.log('All commission users loaded:', allUsers?.length || 0);
        
        if (!allUsers) return;
        
        // Filter users based on current user's hierarchy access
        let filteredUsers: User[] = [];
        
        switch (currentUser.user_type) {
          case 'Global':
            // Global can see all users
            filteredUsers = allUsers;
            break;
            
          case 'Master':
            // Master can see themselves + their escritórios + their assessors
            filteredUsers = allUsers.filter(user => 
              user.id === currentUser.id || // themselves
              user.parent_id === currentUser.id || // direct subordinates (escritórios)
              allUsers.some(escritorio => 
                escritorio.parent_id === currentUser.id && 
                user.parent_id === escritorio.id
              ) // assessors under their escritórios
            );
            break;
            
          case 'Escritório':
            // Escritório can see themselves + their master + their assessors
            filteredUsers = allUsers.filter(user => 
              user.id === currentUser.id || // themselves
              user.id === currentUser.parent_id || // their master
              user.parent_id === currentUser.id // their assessors
            );
            break;
            
          case 'Assessor':
            // Assessor can see themselves + their escritório + their master
            const escritorio = allUsers.find(u => u.id === currentUser.parent_id);
            filteredUsers = allUsers.filter(user => 
              user.id === currentUser.id || // themselves
              user.id === currentUser.parent_id || // their escritório
              (escritorio && user.id === escritorio.parent_id) // their master
            );
            break;
            
          default:
            filteredUsers = [];
            break;
        }
        
        console.log('Filtered commission users:', filteredUsers.length, filteredUsers);
        
        // Separate users by type (for commission split dropdowns)
        const masters = filteredUsers.filter(u => u.user_type === 'Master');
        const escritorios = filteredUsers.filter(u => u.user_type === 'Escritório');
        const assessors = filteredUsers.filter(u => u.user_type === 'Assessor');
        
        console.log('Separated users - Masters:', masters.length, 'Escritórios:', escritorios.length, 'Assessors:', assessors.length);
        
        setMasters(masters);
        setEscritorios(escritorios);
        setAssessors(assessors);
        
      } catch (err) {
        console.error('Error loading commission users:', err);
      }
    };
    
    loadCommissionUsers();
  }, [currentUser]);

  // Auto-select commission users based on hierarchy
  const autoSelectCommissionUsers = () => {
    if (!currentUser) return;

    console.log('Auto-selecting commission users for:', currentUser.user_type, currentUser.email);

    switch (currentUser.user_type) {
      case 'Master':
        // Master: Auto-select themselves as master
        setFormData(prev => ({
          ...prev,
          master_id: currentUser.id,
          escritorio_id: '', // Must select manually
          assessor_id: '' // Must select manually
        }));
        break;

      case 'Escritório':
        // Escritório: Auto-select their master and themselves
        setFormData(prev => ({
          ...prev,
          master_id: currentUser.parent_id || '',
          escritorio_id: currentUser.id,
          assessor_id: '' // Must select manually
        }));
        break;

      case 'Assessor':
        // Assessor: Auto-select master, escritório and themselves
        const escritorio = escritorios.find(e => e.id === currentUser.parent_id);
        setFormData(prev => ({
          ...prev,
          master_id: escritorio?.parent_id || '',
          escritorio_id: currentUser.parent_id || '',
          assessor_id: currentUser.id
        }));
        break;

      case 'Global':
        // Global: Don't auto-select, let them choose manually
        setFormData(prev => ({
          ...prev,
          master_id: '',
          escritorio_id: '',
          assessor_id: ''
        }));
        break;
    }
  };

  // Debug modal opening
  const handleOpenModal = async () => {
    console.log('Opening modal, currentUser:', currentUser);
    console.log('Current state - investors:', investors.length, 'masters:', masters.length, 'escritorios:', escritorios.length, 'assessors:', assessors.length);
    
    // Force reload data when modal opens
    if (currentUser) {
      console.log('Force loading data for modal...');
      
      try {
        // Load investors
        console.log('Force loading investors...');
        const { data: investorData, error: investorError } = await supabase
          .from('users')
          .select('*')
          .eq('user_type', 'Investidor')
          .order('name');
          
        if (investorError) {
          console.error('Force load investors error:', investorError);
        } else {
          console.log('Force loaded investors:', investorData?.length || 0, investorData);
          setInvestors(investorData || []);
        }
        
        // Load commission users
        console.log('Force loading commission users...');
        const { data: allCommissionData, error: commissionError } = await supabase
          .from('users')
          .select('*')
          .neq('user_type', 'Investidor')
          .order('name');
          
        if (commissionError) {
          console.error('Force load commission users error:', commissionError);
        } else {
          console.log('Force loaded all commission users:', allCommissionData?.length || 0, allCommissionData);
          
          if (allCommissionData) {
            // Filter users based on current user's hierarchy access
            let filteredUsers: User[] = [];
            
            switch (currentUser.user_type) {
              case 'Global':
                // Global can see all users
                filteredUsers = allCommissionData;
                break;
                
              case 'Master':
                // Master can see themselves + their escritórios + their assessors
                filteredUsers = allCommissionData.filter(user => 
                  user.id === currentUser.id || // themselves
                  user.parent_id === currentUser.id || // direct subordinates (escritórios)
                  allCommissionData.some(escritorio => 
                    escritorio.parent_id === currentUser.id && 
                    user.parent_id === escritorio.id
                  ) // assessors under their escritórios
                );
                break;
                
              case 'Escritório':
                // Escritório can see themselves + their master + their assessors
                filteredUsers = allCommissionData.filter(user => 
                  user.id === currentUser.id || // themselves
                  user.id === currentUser.parent_id || // their master
                  user.parent_id === currentUser.id // their assessors
                );
                break;
                
              case 'Assessor':
                // Assessor can see themselves + their escritório + their master
                const escritorio = allCommissionData.find(u => u.id === currentUser.parent_id);
                filteredUsers = allCommissionData.filter(user => 
                  user.id === currentUser.id || // themselves
                  user.id === currentUser.parent_id || // their escritório
                  (escritorio && user.id === escritorio.parent_id) // their master
                );
                break;
                
              default:
                filteredUsers = [];
                break;
            }
            
            console.log('Force filtered commission users:', filteredUsers.length, filteredUsers);
            
            const masters = filteredUsers.filter(u => u.user_type === 'Master');
            const escritorios = filteredUsers.filter(u => u.user_type === 'Escritório');
            const assessors = filteredUsers.filter(u => u.user_type === 'Assessor');
            
            console.log('Force separated - Masters:', masters.length, 'Escritórios:', escritorios.length, 'Assessors:', assessors.length);
            
            setMasters(masters);
            setEscritorios(escritorios);
            setAssessors(assessors);
          }
        }
        
      } catch (err) {
        console.error('Force load error:', err);
      }
    }
    
    // Auto-select commission users based on hierarchy
    setTimeout(() => {
      autoSelectCommissionUsers();
    }, 100);
    
    setIsModalOpen(true);
  };

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

  // Get today's date
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Validate commission split - ONLY check series limit, not 100%
  const validateCommissionSplit = () => {
    const assessor = parseFloat(formData.assessor_commission_percentage) || 0;
    const escritorio = parseFloat(formData.escritorio_commission_percentage) || 0;
    const master = parseFloat(formData.master_commission_percentage) || 0;
    
    const total = assessor + escritorio + master;
    
    // Only validate against series maximum, not 100%
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
        investment_date: getTodayDate(),
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
      
      // Close modal
      setIsModalOpen(false);
      
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

  // Open modal
  const openModal = () => {
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
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
    setError('');
    setSuccess('');
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Investimentos</h1>
            <p className="text-gray-600">Crie e gerencie investimentos em debêntures</p>
          </div>
          <button
            onClick={handleOpenModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <span>+</span>
            <span>Criar Investimento</span>
          </button>
        </div>

        {/* Investments Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Investimentos Criados</h2>
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
                {investments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Nenhum investimento encontrado
                    </td>
                  </tr>
                ) : (
                  investments.map((investment) => (
                    <tr key={investment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{investment.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(investment as any).debentures?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(investment as any).series?.series_letter || 'N/A'} - {(investment as any).series?.commercial_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(investment as any).investor?.full_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(investment.investment_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(investment.investment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(investment.maturity_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          investment.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                          investment.status === 'Vencido' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {investment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Criar Novo Investimento</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-600 text-sm">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Debenture */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Debênture *
                    </label>
                    <select
                      value={formData.debenture_id}
                      onChange={(e) => handleDebentureChange(e.target.value)}
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

                  {/* Series */}
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
                          {serie.series_letter} - {serie.commercial_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Investor */}
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
                          {investor.full_name || investor.name} ({investor.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Responsible */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Responsável
                    </label>
                    <input
                      type="text"
                      value={currentUser?.full_name || user?.email || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      readOnly
                    />
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

                  {/* Investment Date (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data
                    </label>
                    <input
                      type="date"
                      value={getTodayDate()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      readOnly
                    />
                  </div>

                  {/* Maturity Date (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vencimento
                    </label>
                    <input
                      type="date"
                      value={calculateMaturityDate()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                </div>

                {/* Series Information Display */}
                {selectedSeries && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Informações da Série</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                      <span className={`font-bold ${getCommissionTotal() > (selectedSeries?.max_commission_year || 100) ? 'text-red-600' : 'text-green-600'}`}>
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

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Criando...' : 'Criar Investimento'}
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

export default InvestmentManagement;

