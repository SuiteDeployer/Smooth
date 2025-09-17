import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../Layout/AppLayout';
import { generateCommissions } from '../../utils/commissionGenerator';
import RestrictedField from '../common/RestrictedField';

interface Investment {
  id: number;
  debenture_id: string;
  series_id: string;
  investor_user_id: string;
  head_user_id: string;
  escritorio_user_id: string;
  master_user_id: string;
  investment_amount: number;
  investment_date: string;
  maturity_date: string;
  head_commission_percentage: number;
  escritorio_commission_percentage: number;
  master_commission_percentage: number;
  head_commission_amount?: number;
  escritorio_commission_amount?: number;
  master_commission_amount?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
  commission_master: number;
  commission_escritorio: number;
  commission_head: number;
  global_user_id: string;
  commission_global: number;
  // Dados relacionados via queries separadas
  debentures?: {
    id: string;
    name: string;
    issuer: string;
  };
  series?: {
    id: string;
    series_letter: string;
    commercial_name: string;
  };
  investor?: {
    id: string;
    name: string;
    email: string;
  };
  head?: {
    id: string;
    name: string;
    email: string;
  };
  escritorio?: {
    id: string;
    name: string;
    email: string;
  };
  master?: {
    id: string;
    name: string;
    email: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
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
  max_percentage_year: number;
  max_percentage_month: number;
  remuneration_year: number;
  remuneration_month: number;
  captacao_amount: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  full_name?: string; // Alias for name for compatibility
  user_type: 'Global' | 'Master' | 'Escritório' | 'Head' | 'Agente' | 'Investidor';
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
  head_id?: string;
}

const InvestmentManagement: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for form data
  const [formData, setFormData] = useState({
    debenture_id: '',
    series_id: '',
    investor_id: '',
    head_id: '',
    escritorio_id: '',
    master_id: '',
    agente_id: '',
    investment_amount: '',
    head_commission_percentage: '',
    escritorio_commission_percentage: '',
    master_commission_percentage: '',
    agente_commission_percentage: '',
    investor_percentage: '',
    notes: ''
  });

  // State for dropdowns data
  const [debentures, setDebentures] = useState<Debenture[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [investors, setInvestors] = useState<User[]>([]);
  const [masters, setMasters] = useState<User[]>([]);
  const [escritorios, setEscritorios] = useState<User[]>([]);
  const [heads, setHeads] = useState<User[]>([]);
  const [agentes, setAgentes] = useState<User[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  
  // State for selected series info
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  
  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

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
            // Master can see themselves + their escritórios + their heads
            filteredUsers = allUsers.filter(user => 
              user.id === currentUser.id || // themselves
              user.parent_id === currentUser.id || // direct subordinates (escritórios)
              allUsers.some(escritorio => 
                escritorio.parent_id === currentUser.id && 
                user.parent_id === escritorio.id
              ) // heads under their escritórios
            );
            break;
            
          case 'Escritório':
            // Escritório can see themselves + their master + their heads
            filteredUsers = allUsers.filter(user => 
              user.id === currentUser.id || // themselves
              user.id === currentUser.parent_id || // their master
              user.parent_id === currentUser.id // their heads
            );
            break;
            
          case 'Head':
            // Head can see themselves + their escritório + their master
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
        const heads = filteredUsers.filter(u => u.user_type === 'Head');
        const agentes = filteredUsers.filter(u => u.user_type === 'Agente');
        
        console.log('Separated users - Masters:', masters.length, 'Escritórios:', escritorios.length, 'Heads:', heads.length, 'Agentes:', agentes.length);
        
        setMasters(masters);
        setEscritorios(escritorios);
        setHeads(heads);
        setAgentes(agentes);
        
      } catch (err) {
        console.error('Error loading commission users:', err);
      }
    };
    
    loadCommissionUsers();
  }, [currentUser]);

  // Auto-select commission users based on hierarchy
  const autoSelectCommissionUsers = () => {
    if (!currentUser) {
      console.log('❌ Auto-select: currentUser não encontrado');
      return;
    }

    console.log('🔄 Auto-selecting commission users for:', currentUser.user_type, currentUser.email);
    console.log('🔄 Current user parent_id:', currentUser.parent_id);

    switch (currentUser.user_type) {
      case 'Master':
        console.log('🔄 Auto-select Master: Selecionando ele mesmo como master');
        // Master: Auto-select themselves as master
        setFormData(prev => ({
          ...prev,
          master_id: currentUser.id,
          escritorio_id: '', // Must select manually
          head_id: '' // Must select manually
        }));
        break;

      case 'Escritório':
        console.log('🔄 Auto-select Escritório: Master =', currentUser.parent_id, ', Escritório =', currentUser.id);
        // Escritório: Auto-select their master and themselves
        setFormData(prev => ({
          ...prev,
          master_id: currentUser.parent_id || '',
          escritorio_id: currentUser.id,
          head_id: '' // Must select manually
        }));
        break;

      case 'Head':
        // Head: Auto-select master, escritório and themselves
        const escritorio = escritorios.find(e => e.id === currentUser.parent_id);
        console.log('🔄 Auto-select Head: Escritório encontrado =', escritorio?.name, ', Master =', escritorio?.parent_id);
        setFormData(prev => ({
          ...prev,
          master_id: escritorio?.parent_id || '',
          escritorio_id: currentUser.parent_id || '',
          head_id: currentUser.id
        }));
        break;

      case 'Global':
        console.log('🔄 Auto-select Global: Não selecionando automaticamente');
        // Global: Don't auto-select, let them choose manually
        setFormData(prev => ({
          ...prev,
          master_id: '',
          escritorio_id: '',
          head_id: ''
        }));
        break;
        
      default:
        console.log('❌ Auto-select: Tipo de usuário não reconhecido:', currentUser.user_type);
        break;
    }
    
    console.log('✅ Auto-select concluído');
  };

  // Debug modal opening
  const handleOpenModal = async () => {
    console.log('Opening modal, currentUser:', currentUser);
    console.log('Current state - investors:', investors.length, 'masters:', masters.length, 'escritorios:', escritorios.length, 'heads:', heads.length);
    
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
                // Master can see themselves + their escritórios + their heads
                filteredUsers = allCommissionData.filter(user => 
                  user.id === currentUser.id || // themselves
                  user.parent_id === currentUser.id || // direct subordinates (escritórios)
                  allCommissionData.some(escritorio => 
                    escritorio.parent_id === currentUser.id && 
                    user.parent_id === escritorio.id
                  ) // heads under their escritórios
                );
                break;
                
              case 'Escritório':
                // Escritório can see themselves + their master + their heads
                filteredUsers = allCommissionData.filter(user => 
                  user.id === currentUser.id || // themselves
                  user.id === currentUser.parent_id || // their master
                  user.parent_id === currentUser.id // their heads
                );
                break;
                
              case 'Head':
                // Head can see themselves + their escritório + their master
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
            const heads = filteredUsers.filter(u => u.user_type === 'Head');
            const agentes = filteredUsers.filter(u => u.user_type === 'Agente');
            
            console.log('Force separated - Masters:', masters.length, 'Escritórios:', escritorios.length, 'Heads:', heads.length, 'Agentes:', agentes.length);
            
            setMasters(masters);
            setEscritorios(escritorios);
            setHeads(heads);
            setAgentes(agentes);
          }
        }
        
      } catch (err) {
        console.error('Force load error:', err);
      }
    }
    
    // Auto-select commission users based on hierarchy APÓS carregar os dados
    setTimeout(() => {
      console.log('🔄 Executando auto-select após carregamento dos dados...');
      console.log('Estado atual - Masters:', masters.length, 'Escritórios:', escritorios.length, 'Heads:', heads.length);
      console.log('Current user:', currentUser?.user_type, currentUser?.email, 'Parent ID:', currentUser?.parent_id);
      autoSelectCommissionUsers();
    }, 200); // Aumentando timeout para garantir que dados estejam carregados
    
    setIsModalOpen(true);
  };

  // Load investments with related data using separate queries
  const loadInvestments = async () => {
    try {
      console.log('Loading investments...');
      
      // 1. Buscar investimentos (query principal que funciona)
      const { data: investmentsData, error: investmentsError } = await supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (investmentsError) {
        console.error('Error loading investments:', investmentsError);
        throw investmentsError;
      }
      
      console.log('Investments loaded:', investmentsData?.length || 0);
      
      if (!investmentsData || investmentsData.length === 0) {
        setInvestments([]);
        return;
      }
      
      // 2. Buscar dados relacionados separadamente
      const debentureIds = [...new Set(investmentsData.map(inv => inv.debenture_id))];
      const seriesIds = [...new Set(investmentsData.map(inv => inv.series_id))];
      const userIds = [...new Set([
        ...investmentsData.map(inv => inv.investor_user_id),
        ...investmentsData.map(inv => inv.head_user_id),
        ...investmentsData.map(inv => inv.escritorio_user_id),
        ...investmentsData.map(inv => inv.master_user_id),
        ...investmentsData.map(inv => inv.created_by)
      ])];
      
      // Buscar debêntures
      const { data: debenturesData } = await supabase
        .from('debentures')
        .select('id, name, issuer')
        .in('id', debentureIds);
        
      // Buscar séries
      const { data: seriesData } = await supabase
        .from('series')
        .select('id, debenture_id, series_letter, commercial_name, term_months, max_percentage_year, max_percentage_month, remuneration_year, remuneration_month, captacao_amount')
        .in('id', seriesIds);
        
      // Buscar usuários
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);
      
      // 3. Combinar dados
      const enrichedInvestments = investmentsData.map(investment => ({
        ...investment,
        debentures: debenturesData?.find(d => d.id === investment.debenture_id),
        series: seriesData?.find(s => s.id === investment.series_id),
        investor: usersData?.find(u => u.id === investment.investor_user_id),
        head: usersData?.find(u => u.id === investment.head_user_id),
        escritorio: usersData?.find(u => u.id === investment.escritorio_user_id),
        master: usersData?.find(u => u.id === investment.master_user_id),
        creator: usersData?.find(u => u.id === investment.created_by)
      }));
      
      console.log('Enriched investments with related data:', enrichedInvestments.length);
      setInvestments(enrichedInvestments);
      
    } catch (err) {
      console.error('Error loading investments:', err);
      setError('Erro ao carregar investimentos: ' + (err as Error).message);
    }
  };

  useEffect(() => {
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
    const head = parseFloat(formData.head_commission_percentage) || 0;
    const escritorio = parseFloat(formData.escritorio_commission_percentage) || 0;
    const master = parseFloat(formData.master_commission_percentage) || 0;
    
    const total = head + escritorio + master;
    
    // Only validate against series maximum, not 100%
    if (selectedSeries) {
      const maxCommission = selectedSeries.max_percentage_year;
      if (total > maxCommission) {
        setError(`O total dos percentuais de comissão não pode ultrapassar ${maxCommission}% (percentual máximo da série)`);
        return false;
      }
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCommissionSplit()) return;
    
    // Validar limites de captação apenas para novos investimentos
    if (!isEditing) {
      const investmentAmount = parseFloat(formData.investment_amount) || 0;
      
      if (selectedSeries) {
        // Buscar captação atual da série
        const { data: currentInvestments, error: investError } = await supabase
          .from('investments')
          .select('investment_amount')
          .eq('series_id', selectedSeries.id)
          .eq('status', 'active');
          
        if (investError) {
          setError('Erro ao verificar captação atual da série');
          setLoading(false);
          return;
        }
        
        const currentCaptation = currentInvestments?.reduce((sum, inv) => 
          sum + (parseFloat(inv.investment_amount) || 0), 0) || 0;
        const maxCaptation = selectedSeries.captacao_amount || 0;
        const availableCaptation = maxCaptation - currentCaptation;
        
        if (investmentAmount > availableCaptation) {
          setError(`Investimento excede limite da série. Disponível: ${formatCurrency(availableCaptation)} de ${formatCurrency(maxCaptation)}`);
          setLoading(false);
          return;
        }
        
        // Verificar limite da debênture se existir
        if (formData.debenture_id) {
          const { data: debenture } = await supabase
            .from('debentures')
            .select('total_amount')
            .eq('id', formData.debenture_id)
            .single();
            
          if (debenture?.total_amount) {
            const { data: debentureInvestments } = await supabase
              .from('investments')
              .select('investment_amount')
              .eq('debenture_id', formData.debenture_id)
              .eq('status', 'active');
              
            const currentDebCaptation = debentureInvestments?.reduce((sum, inv) => 
              sum + (parseFloat(inv.investment_amount) || 0), 0) || 0;
            const maxDebCaptation = debenture.total_amount;
            const availableDebCaptation = maxDebCaptation - currentDebCaptation;
            
            if (investmentAmount > availableDebCaptation) {
              setError(`Investimento excede limite da debênture. Disponível: ${formatCurrency(availableDebCaptation)} de ${formatCurrency(maxDebCaptation)}`);
              setLoading(false);
              return;
            }
          }
        }
      }
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Form data before submit:', formData);
      console.log('Selected series:', selectedSeries);
      console.log('Is editing:', isEditing);
      console.log('Editing investment:', editingInvestment);
      
      let data, error;
      
      if (isEditing && editingInvestment) {
        // UPDATE existing investment - only update fields that can be changed
        const updateData = {
          investment_amount: parseFloat(formData.investment_amount) || 0,
          head_commission_percentage: parseFloat(formData.head_commission_percentage) || 0,
          escritorio_commission_percentage: parseFloat(formData.escritorio_commission_percentage) || 0,
          master_commission_percentage: parseFloat(formData.master_commission_percentage) || 0,
          commission_master: parseFloat(formData.master_commission_percentage) || 0,
          commission_escritorio: parseFloat(formData.escritorio_commission_percentage) || 0,
          commission_head: parseFloat(formData.head_commission_percentage) || 0,
          notes: formData.notes || '',
          updated_at: new Date().toISOString(),
          updated_by: userProfile?.id || ''
        };
        
        console.log('Update data (preserving existing relationships):', updateData);
        
        const result = await supabase
          .from('investments')
          .update(updateData)
          .eq('id', editingInvestment.id)
          .select();
        data = result.data;
        error = result.error;
      } else {
        // INSERT new investment - include all required fields
        const investmentData = {
          debenture_id: formData.debenture_id,
          series_id: formData.series_id,
          investor_user_id: formData.investor_id,
          head_user_id: formData.head_id,
          master_user_id: formData.master_id,
          escritorio_user_id: formData.escritorio_id,
          global_user_id: userProfile?.id || '',
          investment_amount: parseFloat(formData.investment_amount) || 0,
          investment_date: getTodayDate(),
          maturity_date: calculateMaturityDate(),
          head_commission_percentage: parseFloat(formData.head_commission_percentage) || 0,
          escritorio_commission_percentage: parseFloat(formData.escritorio_commission_percentage) || 0,
          master_commission_percentage: parseFloat(formData.master_commission_percentage) || 0,
          commission_master: parseFloat(formData.master_commission_percentage) || 0,
          commission_escritorio: parseFloat(formData.escritorio_commission_percentage) || 0,
          commission_head: parseFloat(formData.head_commission_percentage) || 0,
          commission_global: 0,
          status: 'active',
          notes: formData.notes || '',
          created_by: userProfile?.id || ''
        };
        
        console.log('Investment data to insert:', investmentData);
        
        const result = await supabase
          .from('investments')
          .insert([investmentData])
          .select();
        data = result.data;
        error = result.error;
      }
        
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Investment saved:', data);
      
      // Debug da condição para geração de comissões
      console.log('🔍 DEBUG - isEditing:', isEditing);
      console.log('🔍 DEBUG - data:', data);
      console.log('🔍 DEBUG - data[0]:', data && data[0]);
      console.log('🔍 DEBUG - Condição completa:', !isEditing && data && data[0]);
      
      // Gerar comissões automaticamente para novos investimentos
      if (!isEditing && data && data[0]) {
        const newInvestmentId = data[0].id;
        console.log('🔄 Gerando comissões para investimento:', newInvestmentId);
        
        try {
          const commissionResult = await generateCommissions(newInvestmentId);
          
          if (commissionResult.success) {
            console.log('✅ Comissões geradas:', commissionResult.data);
            
            // Gerar remunerações para o investimento
            try {
              console.log('🔄 Gerando remunerações para investimento:', newInvestmentId);
              
              const { error: remunerationError } = await supabase
                .rpc('generate_remunerations_for_investment', {
                  investment_id_param: newInvestmentId
                });
              
              if (remunerationError) {
                console.error('❌ Erro ao gerar remunerações:', remunerationError);
                setSuccess(`Investimento criado com sucesso! ${commissionResult.data.commissionsCreated} comissões geradas, mas houve erro ao gerar remunerações.`);
              } else {
                console.log('✅ Remunerações geradas com sucesso');
                setSuccess(`Investimento criado com sucesso! ${commissionResult.data.commissionsCreated} comissões e remunerações geradas para ${commissionResult.data.totalUsers} usuários.`);
              }
            } catch (error) {
              console.error('💥 Erro fatal ao gerar remunerações:', error);
              setSuccess(`Investimento criado com sucesso! ${commissionResult.data.commissionsCreated} comissões geradas, mas houve erro fatal ao gerar remunerações.`);
            }
          } else {
            console.error('❌ Erro ao gerar comissões:', commissionResult.error);
            setSuccess('Investimento criado com sucesso, mas houve erro ao gerar comissões. Verifique no controle de comissões.');
          }
        } catch (error) {
          console.error('💥 Erro fatal ao gerar comissões:', error);
          setSuccess('Investimento criado com sucesso, mas houve erro fatal ao gerar comissões.');
        }
      } else {
        console.log('⚠️ Condição não atendida para geração de comissões');
        setSuccess(isEditing ? 'Investimento atualizado com sucesso!' : 'Investimento criado com sucesso!');
      }
      
      // Reset form
      setFormData({
        debenture_id: '',
        series_id: '',
        investor_id: '',
        head_id: '',
        escritorio_id: '',
        master_id: '',
        agente_id: '',
        investment_amount: '',
        head_commission_percentage: '',
        escritorio_commission_percentage: '',
        master_commission_percentage: '',
        agente_commission_percentage: '',
        investor_percentage: '',
        notes: ''
      });
      setSelectedSeries(null);
      
      // Close modal
      setIsModalOpen(false);
      
      // Reload investments with complete data
      await loadInvestments();
      
    } catch (err: any) {
      console.error('Error creating investment:', err);
      setError(err.message || 'Erro ao criar investimento');
    } finally {
      setLoading(false);
    }
  };

  // Calculate commission total
  const getCommissionTotal = () => {
    const head = parseFloat(formData.head_commission_percentage) || 0;
    const escritorio = parseFloat(formData.escritorio_commission_percentage) || 0;
    const master = parseFloat(formData.master_commission_percentage) || 0;
    const agente = parseFloat(formData.agente_commission_percentage) || 0;
    return head + escritorio + master + agente;
  };

  const getPercentualTotal = () => {
    const commission = getCommissionTotal();
    const investor = parseFloat(formData.investor_percentage) || 0;
    return commission + investor;
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
      head_id: '',
      escritorio_id: '',
      master_id: '',
      agente_id: '',
      investment_amount: '',
      head_commission_percentage: '',
      escritorio_commission_percentage: '',
      master_commission_percentage: '',
      agente_commission_percentage: '',
      investor_percentage: '',
      notes: ''
    });
    setSelectedSeries(null);
    setError('');
    setSuccess('');
    setIsEditing(false);
    setEditingInvestment(null);
  };

  // Handle delete investment (apenas Global)
  const handleDeleteInvestment = async (investment: Investment) => {
    if (userProfile?.user_type !== 'Global') {
      alert('Apenas usuários Global podem deletar investimentos');
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja deletar o investimento #${investment.id}?\n\n` +
      `⚠️ ATENÇÃO: Esta ação também deletará TODAS as comissões relacionadas a este investimento.\n\n` +
      `Esta ação não pode ser desfeita.`
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);
      
      // 1. Primeiro deletar todas as comissões relacionadas
      console.log('🗑️ Deletando comissões do investimento:', investment.id);
      const { error: commissionsError } = await supabase
        .from('commissions')
        .delete()
        .eq('investment_id', investment.id);

      if (commissionsError) {
        console.error('Erro ao deletar comissões:', commissionsError);
        throw new Error('Erro ao deletar comissões relacionadas');
      }

      // 2. Depois deletar o investimento
      console.log('🗑️ Deletando investimento:', investment.id);
      const { error: investmentError } = await supabase
        .from('investments')
        .delete()
        .eq('id', investment.id);

      if (investmentError) {
        console.error('Erro ao deletar investimento:', investmentError);
        throw new Error('Erro ao deletar investimento');
      }

      // 3. Atualizar lista local
      setInvestments(prev => prev.filter(inv => inv.id !== investment.id));
      
      setSuccess(`Investimento #${investment.id} e suas comissões foram deletados com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao deletar investimento:', error);
      setError(error instanceof Error ? error.message : 'Erro ao deletar investimento');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit investment
  const handleEditInvestment = async (investment: Investment) => {
    try {
      setIsEditing(true);
      setEditingInvestment(investment);
      
      // Carregar investidores (necessário para popular o dropdown)
      console.log('Loading investors for edit modal...');
      const { data: investorData, error: investorError } = await supabase
        .from('users')
        .select('*')
        .eq('user_type', 'Investidor')
        .order('name');
        
      if (investorError) {
        console.error('Error loading investors for edit:', investorError);
      } else {
        console.log('Loaded investors for edit:', investorData?.length || 0);
        setInvestors(investorData || []);
      }
      
      // Carregar séries da debênture ANTES de definir o formData
      console.log('Loading series for debenture:', investment.debenture_id);
      if (investment.debenture_id) {
        try {
          const { data: seriesData, error: seriesError } = await supabase
            .from('series')
            .select('*')
            .eq('debenture_id', investment.debenture_id)
            .order('series_letter');
            
          if (seriesError) throw seriesError;
          console.log('Loaded series for edit:', seriesData?.length || 0);
          setSeries(seriesData || []);
        } catch (err) {
          console.error('Error loading series for edit:', err);
        }
      }
      
      // Buscar série completa para exibir informações
      if (investment.series_id) {
        const { data: selectedSeriesData } = await supabase
          .from('series')
          .select('id, debenture_id, series_letter, commercial_name, term_months, max_percentage_year, max_percentage_month, remuneration_year, remuneration_month, captacao_amount')
          .eq('id', investment.series_id)
          .single();
        
        console.log('Loaded selected series for edit:', selectedSeriesData);
        setSelectedSeries(selectedSeriesData || null);
      } else {
        setSelectedSeries(null);
      }
      
      // Preencher formulário com dados do investimento APÓS carregar as listas
      setFormData({
        debenture_id: investment.debenture_id,
        series_id: investment.series_id,
        investor_id: investment.investor_user_id,
        head_id: investment.head_user_id,
        escritorio_id: investment.escritorio_user_id,
        master_id: investment.master_user_id,
        agente_id: '', // Campo novo, não existe no investment atual
        investment_amount: investment.investment_amount.toString(),
        head_commission_percentage: investment.head_commission_percentage.toString(),
        escritorio_commission_percentage: investment.escritorio_commission_percentage.toString(),
        master_commission_percentage: investment.master_commission_percentage.toString(),
        agente_commission_percentage: '', // Campo novo, não existe no investment atual
        investor_percentage: '', // Campo novo, não existe no investment atual
        notes: investment.notes || ''
      });
      
      console.log('Form data set for edit:', {
        debenture_id: investment.debenture_id,
        series_id: investment.series_id,
        investor_id: investment.investor_user_id
      });
      
      // Abrir modal
      setIsModalOpen(true);
      setError('');
      setSuccess('');
      
    } catch (err) {
      console.error('Error loading investment for edit:', err);
      setError('Erro ao carregar investimento para edição');
    }
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
            {(userProfile?.user_type === 'Global' || userProfile?.user_type === 'Master') && (
              <button
                onClick={handleOpenModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>+</span>
                <span>Criar Investimento</span>
              </button>
            )}
          </div>

        {/* Investments Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden" style={{ minWidth: '1200px' }}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Investimentos Criados</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debênture</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Série</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investidor</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {investments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-12 text-center text-gray-500">
                      Nenhum investimento encontrado
                    </td>
                  </tr>
                ) : (
                  investments.map((investment) => (
                    <tr key={investment.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{investment.id}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <RestrictedField value={investment.debentures?.name} />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <RestrictedField value={investment.series ? `${investment.series.series_letter} - ${investment.series.commercial_name}` : null} />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <RestrictedField value={investment.investor?.name} />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(investment.investment_amount)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(investment.investment_date)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(investment.maturity_date)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          investment.status === 'active' ? 'bg-green-100 text-green-800' :
                          investment.status === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {investment.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                        {(userProfile?.user_type === 'Global' || 
                          userProfile?.user_type === 'Master') && (
                          <button
                            onClick={() => handleEditInvestment(investment)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Editar
                          </button>
                        )}
                        {userProfile?.user_type === 'Global' && (
                          <button
                            onClick={() => handleDeleteInvestment(investment)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Deletar
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

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditing ? 'Editar Investimento' : 'Criar Novo Investimento'}
                </h2>
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
                        <span className="font-medium">Percentual Máximo ao Ano:</span>
                        <p>{selectedSeries.max_percentage_year}%</p>
                      </div>
                      <div>
                        <span className="font-medium">Percentual Máximo ao Mês:</span>
                        <p>{selectedSeries.max_percentage_month}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Commission Split */}
                <div className="bg-blue-50 p-4 rounded-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Split de Percentual</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Master */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Master <span className="text-xs text-blue-600">(Comissão)</span>
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
                            {master.email || master.full_name || master.name || `Master ${master.id}`}
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
                        Escritório <span className="text-xs text-blue-600">(Comissão)</span>
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
                            {escritorio.email || escritorio.full_name || escritorio.name || `Escritório ${escritorio.id}`}
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

                    {/* Head */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Head <span className="text-xs text-blue-600">(Comissão)</span>
                      </label>
                      <select
                        value={formData.head_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, head_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        required
                      >
                        <option value="">Selecione um head</option>
                        {heads.map(head => (
                          <option key={head.id} value={head.id}>
                            {head.email || head.full_name || head.name || `Head ${head.id}`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Percentual (%)"
                        value={formData.head_commission_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, head_commission_percentage: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Agente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Agente <span className="text-xs text-blue-600">(Comissão)</span>
                      </label>
                      <select
                        value={formData.agente_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, agente_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      >
                        <option value="">Selecione um agente</option>
                        {agentes.map(agente => (
                          <option key={agente.id} value={agente.id}>
                            {agente.email || agente.full_name || agente.name || `Agente ${agente.id}`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Percentual (%)"
                        value={formData.agente_commission_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, agente_commission_percentage: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Investidor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Investidor <span className="text-xs text-green-600">(Remuneração)</span>
                      </label>
                      <select
                        value={formData.investor_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, investor_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        required
                      >
                        <option value="">Selecione um investidor</option>
                        {investors.map(investor => (
                          <option key={investor.id} value={investor.id}>
                            {investor.full_name || investor.name} ({investor.email})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Percentual (%)"
                        value={formData.investor_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, investor_percentage: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="mt-4 space-y-3">
                    {/* Commission Total */}
                    <div className="p-3 bg-blue-50 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-800">Total Comissão:</span>
                        <span className={`font-bold ${getCommissionTotal() > (selectedSeries?.max_percentage_year || 100) ? 'text-red-600' : 'text-blue-600'}`}>
                          {getCommissionTotal().toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        Master + Escritório + Head + Agente
                      </div>
                    </div>

                    {/* Investor Percentage */}
                    <div className="p-3 bg-green-50 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-green-800">Remuneração Investidor:</span>
                        <span className="font-bold text-green-600">
                          {(parseFloat(formData.investor_percentage) || 0).toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Percentual destinado à remuneração
                      </div>
                    </div>

                    {/* Total General */}
                    <div className="p-3 bg-gray-50 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Geral:</span>
                        <span className={`font-bold ${getPercentualTotal() > (selectedSeries?.max_percentage_year || 100) ? 'text-red-600' : 'text-gray-700'}`}>
                          {getPercentualTotal().toFixed(2)}%
                        </span>
                      </div>
                      {selectedSeries && (
                        <div className="text-sm text-gray-600 mt-1">
                          Percentual máximo permitido pela série: {selectedSeries.max_percentage_year}%
                        </div>
                      )}
                    </div>
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
                    {loading ? (isEditing ? 'Atualizando...' : 'Criando...') : (isEditing ? 'Atualizar Investimento' : 'Criar Investimento')}
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

