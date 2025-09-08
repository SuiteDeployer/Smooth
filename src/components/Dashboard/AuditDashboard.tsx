import React, { useState, useEffect } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuditLog {
  id: string;
  created_at: string;
  user_email: string;
  user_name?: string;
  description: string;
  action_type?: string;
  resource_type?: string;
  user_role?: string;
}

const AuditDashboard: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);

  // Carregar logs de auditoria usando a função adequada
  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Buscar o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Usar a função de auditoria que considera hierarquia e permissões
      const { data, error } = await supabase.rpc('get_audit_logs_filtered', {
        p_user_id: user.id,
        p_start_date: null,
        p_end_date: null, 
        p_action_type: null,
        p_resource_type: null,
        p_limit: 500, // Aumentar limite para ver mais logs
        p_offset: 0
      });

      if (error) {
        console.error('Erro ao carregar logs:', error);
        // Fallback para query direta em caso de erro na função RPC
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('audit_logs')
          .select('id, created_at, user_email, user_name, description, action_type, resource_type, user_role')
          .order('created_at', { ascending: false })
          .limit(500);
          
        if (fallbackError) {
          console.error('Erro no fallback:', fallbackError);
          setLogs([]);
        } else {
          // Mapear dados do fallback para o formato esperado
          const mappedData = (fallbackData || []).map((log: any) => ({
            id: log.id,
            created_at: log.created_at,
            user_email: log.user_email,
            user_name: log.user_name,
            description: log.description || `${log.action_type || ''} - ${log.resource_type || ''}` || 'Ação do sistema'
          }));
          setLogs(mappedData);
        }
      } else {
        // Mapear dados da função RPC para o formato esperado
        const mappedData = (data || []).map((log: any) => ({
          id: log.id,
          created_at: log.timestamp,
          user_email: log.user_email,
          user_name: log.user_name,
          description: log.description || `${log.action_type || ''} - ${log.resource_type || ''}` || 'Ação do sistema'
        }));
        setLogs(mappedData);
      }
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar logs por usuário
  useEffect(() => {
    if (!searchUser.trim()) {
      setFilteredLogs(logs);
    } else {
      const filtered = logs.filter(log => 
        log.user_email && log.user_email.toLowerCase().includes(searchUser.toLowerCase())
      );
      setFilteredLogs(filtered);
    }
  }, [logs, searchUser]);

  // Formatação da data/hora
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Auditoria</h1>
          <p className="text-gray-600">Logs simples de atividades do sistema</p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtro de busca */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar por usuário
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Digite o email do usuário..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de logs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Logs de Auditoria
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredLogs.length} registros encontrados
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Carregando logs...
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    {searchUser ? 'Nenhum log encontrado para este usuário' : 'Nenhum log encontrado'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.user_name || 'Sistema'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.user_email || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.description || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditDashboard;