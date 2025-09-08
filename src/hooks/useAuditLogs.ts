import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AuditLog {
  id: string;
  user_email: string;
  user_role: string;
  action_type: string;
  resource_type: string;
  resource_name: string;
  description: string;
  created_at: string;
  old_values?: any;
  new_values?: any;
}

export interface AuditStats {
  total_actions: number;
  actions_today: number;
  most_active_users: Array<{ user_email: string; action_count: number }>;
  action_types_count: Record<string, number>;
  resource_types_count: Record<string, number>;
}

export interface AuditFilters {
  start_date?: string;
  end_date?: string;
  action_type?: string;
  resource_type?: string;
  limit?: number;
  offset?: number;
}

export const useAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 });

  const fetchLogs = async (filters: AuditFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const params = new URLSearchParams({
        action: 'get_logs',
        limit: String(filters.limit || 50),
        offset: String(filters.offset || 0),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.action_type && { action_type: filters.action_type }),
        ...(filters.resource_type && { resource_type: filters.resource_type })
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-logs?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao carregar logs');
      }

      const result = await response.json();
      setLogs(result.data || []);
      setPagination(prev => ({
        ...prev,
        limit: result.pagination?.limit || 50,
        offset: result.pagination?.offset || 0,
        total: result.pagination?.total || 0
      }));
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (days: number = 30) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const params = new URLSearchParams({
        action: 'get_stats',
        days: String(days)
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-logs?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao carregar estatísticas');
      }

      const result = await response.json();
      setStats(result.data);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const exportLogs = async (filters: AuditFilters = {}, format: 'csv' | 'json' = 'csv') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const params = new URLSearchParams({
        action: 'export_logs',
        format,
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.action_type && { action_type: filters.action_type }),
        ...(filters.resource_type && { resource_type: filters.resource_type })
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-logs?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao exportar logs');
      }

      // Fazer download do arquivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const filename = response.headers.get('content-disposition')
        ?.match(/filename="(.+)"/)?.[1] 
        || `logs-auditoria-${new Date().toISOString().split('T')[0]}.${format}`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erro ao exportar logs:', err);
      throw err;
    }
  };

  const refreshLogs = (filters?: AuditFilters) => {
    return fetchLogs(filters);
  };

  const loadMore = (filters?: AuditFilters) => {
    const newOffset = pagination.offset + pagination.limit;
    return fetchLogs({ ...filters, offset: newOffset, limit: pagination.limit });
  };

  return {
    logs,
    stats,
    loading,
    error,
    pagination,
    fetchLogs,
    fetchStats,
    exportLogs,
    refreshLogs,
    loadMore
  };
};

export default useAuditLogs;
