import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export interface CommissionMetrics {
  totalMonthCommissions: number;
  pendingCommissions: number;
  activeAdvisors: number;
  conversionRate: number;
  monthGrowth: number;
  advisorGrowth: number;
  conversionChange: number;
  pendingCount: number;
}

export interface CommissionTransaction {
  id: string;
  payment_id: string;
  recipient_name: string;
  recipient_role: string;
  series_code: string;
  series_name: string;
  amount: number;
  status: 'PENDENTE' | 'PAGO' | 'CANCELADO';
  payment_month: string;
  installment_number: number;
  total_installments: number;
  pix_key: string;
  pix_key_type: string;
  invested_amount: number;
  investment_date: string;
  investor_name: string;
  registered_by: string;
  created_at: string;
}

export interface CommissionsData {
  metrics: CommissionMetrics | null;
  transactions: CommissionTransaction[];
  loading: boolean;
  error: string | null;
}

const useCommissionsData = () => {
  const [data, setData] = useState<CommissionsData>({
    metrics: null,
    transactions: [],
    loading: true,
    error: null
  });

  const fetchMetrics = async () => {
    try {
      // Usar Edge Function commission-reports para buscar dashboard
      const { data: reportData, error } = await supabase.functions.invoke('commission-reports', {
        body: { 
          report_type: 'dashboard'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Converter dados do Supabase para estrutura esperada
      const summary = reportData.data?.summary || {};
      
      return {
        totalMonthCommissions: summary.total_amount || 0,
        pendingCommissions: summary.pending_amount || 0,
        activeAdvisors: 3, // Baseado na hierarquia: Assessor, Escritório, Master
        conversionRate: summary.total_amount > 0 ? (summary.paid_amount / summary.total_amount) * 100 : 0,
        monthGrowth: 15.2, // Placeholder - pode ser calculado comparando meses
        advisorGrowth: 8.1, // Placeholder
        conversionChange: 5.3, // Placeholder
        pendingCount: summary.pending_count || 0
      };
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      throw error;
    }
  };

  const fetchTransactions = async () => {
    try {
      // Buscar comissões diretamente da tabela commission_schedules com JOINs necessários
      const { data: commissionsData, error } = await supabase
        .from('commission_schedules')
        .select(`
          id,
          monthly_amount,
          status,
          payment_month,
          installment_number,
          total_installments,
          commission_percentage,
          created_at,
          recipient_role,
          recipient_user:recipient_user_id(full_name, pix_key, pix_key_type),
          investment:investment_id(
            id,
            invested_amount,
            investment_date,
            investor:investor_user_id(full_name),
            assessor:assessor_user_id(full_name),
            series:series_id(name, series_code)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(error.message);
      }

      // Converter para formato esperado
      return commissionsData?.map((commission: any) => ({
        id: commission.id,
        payment_id: `CS-${commission.id}`, // Criando um payment_id baseado no ID da schedule
        recipient_name: commission.recipient_user?.full_name || 'N/A',
        recipient_role: commission.recipient_role,
        series_code: commission.investment?.series?.series_code || 'N/A',
        series_name: commission.investment?.series?.name || 'N/A',
        amount: parseFloat(commission.monthly_amount || 0),
        status: commission.status || 'PENDENTE',
        payment_month: commission.payment_month,
        installment_number: commission.installment_number,
        total_installments: commission.total_installments,
        pix_key: commission.recipient_user?.pix_key || '',
        pix_key_type: commission.recipient_user?.pix_key_type || '',
        invested_amount: parseFloat(commission.investment?.invested_amount || 0),
        investment_date: commission.investment?.investment_date || '',
        investor_name: commission.investment?.investor?.full_name || 'N/A',
        registered_by: commission.investment?.assessor?.full_name || 'N/A',
        created_at: commission.created_at
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      throw error;
    }
  };

  const fetchData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      const [metricsResult, transactionsResult] = await Promise.allSettled([
        fetchMetrics(),
        fetchTransactions()
      ]);

      const metrics = metricsResult.status === 'fulfilled' ? metricsResult.value : null;
      const transactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : [];

      setData({
        metrics,
        transactions,
        loading: false,
        error: null
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  };

  const refreshData = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    ...data,
    refreshData
  };
};

export default useCommissionsData;