import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Investment {
  id: string;
  series_id: string;
  investor_user_id: string;
  assessor_user_id: string;
  master_user_id: string;         // ✅ Adicionado
  escritorio_user_id: string;     // ✅ Adicionado
  global_user_id?: string | null; // ✅ Adicionado (opcional)
  invested_amount: number;
  investment_date: string;
  maturity_date: string;
  interest_type: string;
  interest_rate: number;
  status: string;
  contract_hash?: string;
  contract_signed_at?: string;
  auto_renewal?: boolean;
  commission_master?: number;
  commission_escritorio?: number;
  commission_assessor?: number;
  commission_global?: number;      // ✅ Adicionado (opcional)
  created_at: string;
  updated_at: string;
  // Relacionamentos (Supabase pode retornar como arrays ou objetos únicos)
  series?: {
    id: string;
    name: string;
    debenture_id: string;
    minimum_investment: number;
    maximum_investment?: number;
    duration_months: number;
    interest_rate: number;
    interest_type: string;
    debentures?: {
      id: string;
      name: string;
      issuer_name: string;
      total_emission_value: number;
    } | {
      id: string;
      name: string;
      issuer_name: string;
      total_emission_value: number;
    }[];
  } | {
    id: string;
    name: string;
    debenture_id: string;
    minimum_investment: number;
    maximum_investment?: number;
    duration_months: number;
    interest_rate: number;
    interest_type: string;
    debentures?: {
      id: string;
      name: string;
      issuer_name: string;
      total_emission_value: number;
    } | {
      id: string;
      name: string;
      issuer_name: string;
      total_emission_value: number;
    }[];
  }[];
  investor_user?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  } | {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  }[];
  assessor_user?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  } | {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  }[];
}

export interface UserOption {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
}

export interface SeriesOption {
  id: string;
  series_name: string;
  debenture_name: string;
  issuer_name: string;
  minimum_investment: number;
  maximum_investment: number;
  max_commission_percentage: number;
  duration_months?: number;
  maturity_period_months?: number;
}

export function useAdminInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [series, setSeries] = useState<SeriesOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const { userProfile } = useAuth();

  const loadInvestments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se o usuário tem permissão administrativa
      if (!userProfile) {
        console.log('❌ Perfil do usuário não encontrado ainda');
        setLoading(false);
        return;
      }

      const userRole = userProfile.user_roles?.role_name;
      if (!userRole) {
        console.log('❌ Role do usuário não encontrado');
        setError('Role do usuário não encontrado');
        setLoading(false);
        return;
      }

      if (!['Global', 'Master', 'Escritório', 'Assessor'].includes(userRole)) {
        console.log('❌ Usuário não tem permissão:', userRole);
        setError('Usuário não tem permissão para acessar esta área');
        setLoading(false);
        return;
      }

      console.log('🔍 Carregando investimentos para:', userRole);

      // Buscar investimentos com joins para dados relacionados
      const { data, error: queryError } = await supabase
        .from('investments')
        .select(`
          id,
          series_id,
          investor_user_id,
          assessor_user_id,
          master_user_id,
          escritorio_user_id,
          global_user_id,
          invested_amount,
          investment_date,
          maturity_date,
          interest_type,
          interest_rate,
          status,
          contract_hash,
          contract_signed_at,
          auto_renewal,
          commission_master,
          commission_escritorio,
          commission_assessor,
          commission_global,
          created_at,
          updated_at,
          series (
            id,
            name,
            debenture_id,
            minimum_investment,
            maximum_investment,
            duration_months,
            interest_rate,
            interest_type,
            debentures (
              id,
              name,
              issuer_name,
              total_emission_value
            )
          ),
          investor_user:users!investor_user_id (
            id,
            full_name,
            email,
            phone
          ),
          assessor_user:users!assessor_user_id (
            id,
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      console.log('✅ Investimentos carregados:', data?.length || 0);
      console.log('📊 Dados dos investimentos:', data);
      setInvestments(data || []);

    } catch (err) {
      console.error('❌ Erro ao carregar investimentos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createInvestment = async (investmentData: {
    series_id: string;
    investor_user_id: string;
    assessor_user_id: string;
    invested_amount: number;
    investment_date: string;
    maturity_date: string;
    interest_type: string;
    interest_rate: number;
    status?: string;
    auto_renewal?: boolean;
    commission_master?: number;
    commission_escritorio?: number;
    commission_assessor?: number;
  }) => {
    try {
      console.log('🚀 Criando investimento com dados:', investmentData);
      
      const { data, error } = await supabase
        .from('investments')
        .insert([{
          ...investmentData,
          status: investmentData.status || 'active'
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erro do Supabase ao criar investimento:', error);
        throw error;
      }

      console.log('✅ Investimento criado com sucesso:', data);
      
      // Aguardar um momento para garantir consistência do banco
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recarregar lista
      await loadInvestments();
      
      console.log('🔄 Lista de investimentos recarregada após criação');
      return data;
    } catch (err) {
      console.error('❌ Erro ao criar investimento:', err);
      throw err;
    }
  };

  // REMOVIDO: Função de atualização de investimentos
  // Sistema simplificado não permite edição de investimentos

  const deleteInvestment = async (id: string) => {
    try {
      console.log('🗑️ Excluindo investimento ID:', id);
      
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Erro do Supabase ao excluir investimento:', error);
        throw error;
      }

      console.log('✅ Investimento excluído com sucesso:', id);
      
      // Aguardar um momento para garantir consistência do banco
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recarregar lista
      await loadInvestments();
      
      console.log('🔄 Lista de investimentos recarregada após exclusão');
    } catch (err) {
      console.error('❌ Erro ao excluir investimento:', err);
      throw err;
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingOptions(true);
      console.log('🔍 Carregando usuários...');

      const { data, error: queryError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          user_roles (
            role_name
          )
        `)
        .in('user_roles.role_name', ['Investidor', 'Assessor', 'Escritório', 'Master', 'Global'])
        .order('full_name');

      if (queryError) {
        throw queryError;
      }

      const formattedUsers = data?.map(user => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role_name: Array.isArray(user.user_roles) 
          ? user.user_roles[0]?.role_name || 'Indefinido' 
          : (user.user_roles as any)?.role_name || 'Indefinido'
      })) || [];

      console.log('✅ Usuários carregados:', formattedUsers.length);
      console.log('👥 Detalhes dos usuários:', formattedUsers);
      setUsers(formattedUsers);

    } catch (err) {
      console.error('❌ Erro ao carregar usuários:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadSeries = async () => {
    try {
      setLoadingOptions(true);
      console.log('🔍 Carregando séries...');

      const { data, error: queryError } = await supabase
        .from('series')
        .select(`
          id,
          name,
          minimum_investment,
          maximum_investment,
          max_commission_percentage,
          duration_months,
          debentures (
            name,
            issuer_name
          )
        `)
        .eq('status', 'active')
        .order('name');

      if (queryError) {
        throw queryError;
      }

      const formattedSeries = data?.map(series => ({
        id: series.id,
        series_name: series.name,
        debenture_name: Array.isArray(series.debentures) 
          ? series.debentures[0]?.name || 'N/A' 
          : (series.debentures as any)?.name || 'N/A',
        issuer_name: Array.isArray(series.debentures) 
          ? series.debentures[0]?.issuer_name || 'N/A' 
          : (series.debentures as any)?.issuer_name || 'N/A',
        minimum_investment: series.minimum_investment,
        maximum_investment: series.maximum_investment,
        max_commission_percentage: series.max_commission_percentage || 0,
        duration_months: series.duration_months
      })) || [];

      console.log('✅ Séries carregadas:', formattedSeries.length);
      console.log('📊 Detalhes das séries:', formattedSeries);
      setSeries(formattedSeries);

    } catch (err) {
      console.error('❌ Erro ao carregar séries:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadOptions = async () => {
    await Promise.all([loadUsers(), loadSeries()]);
  };

  useEffect(() => {
    if (userProfile) {
      loadInvestments();
      loadOptions();
    }
  }, [userProfile]);

  return {
    investments,
    loading,
    error,
    users,
    series,
    loadingOptions,
    loadInvestments,
    loadOptions,
    createInvestment,
    deleteInvestment
  };
}
