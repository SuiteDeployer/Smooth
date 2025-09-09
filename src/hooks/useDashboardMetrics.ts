import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { DashboardMetrics } from '../types/dashboard.types';
import toast from 'react-hot-toast';

/**
 * Hook para buscar métricas do dashboard hierárquico
 */
export const useDashboardMetrics = () => {
  return useQuery<DashboardMetrics, Error>({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      console.log('Buscando métricas do dashboard...');
      
      const { data, error } = await supabase.functions.invoke('dashboard-metrics', {
        body: {}
      });

      if (error) {
        console.error('Erro ao buscar métricas:', error);
        throw new Error(`Erro ao buscar métricas: ${error.message}`);
      }

      if (!data?.data) {
        throw new Error('Dados de métricas não encontrados');
      }

      return data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 2,
    refetchOnWindowFocus: false
  });
};

/**
 * Hook para revalidar as métricas do dashboard
 */
export const useRefreshDashboard = () => {
  const { refetch } = useDashboardMetrics();
  
  const refreshMetrics = async () => {
    console.log('Atualizando métricas do dashboard...');
    try {
      await refetch();
      toast.success('Métricas atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar métricas:', error);
      toast.error('Erro ao atualizar métricas');
    }
  };
  
  return { refreshMetrics };
};
