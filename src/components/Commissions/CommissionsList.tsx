import React, { useState, useEffect } from 'react';
import { Eye, CheckCircle, XCircle, Clock, DollarSign, User, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Commission {
  id: string;
  commission_amount: number;
  commission_type: string;
  payment_status: 'pending' | 'processing' | 'approved' | 'paid' | 'rejected' | 'canceled';
  created_at: string;
  paid_at?: string;
  status_changed_at?: string;
  approval_notes?: string;
  user_id: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'processing': return 'bg-blue-100 text-blue-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'paid': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'canceled': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'Pendente';
    case 'processing': return 'Processando';
    case 'approved': return 'Aprovado';
    case 'paid': return 'Pago';
    case 'rejected': return 'Rejeitado';
    case 'canceled': return 'Cancelado';
    default: return status;
  }
};

const getCommissionTypeLabel = (type: string) => {
  switch (type) {
    case 'acquisition': return 'Aquisição';
    case 'management': return 'Gestão';
    case 'performance': return 'Performance';
    default: return type;
  }
};

const getStatusActions = (status: string) => {
  switch (status) {
    case 'pending': return ['processing', 'approved', 'rejected', 'canceled'];
    case 'processing': return ['approved', 'paid', 'rejected', 'canceled'];
    case 'approved': return ['paid', 'canceled'];
    case 'rejected': return ['pending'];
    default: return [];
  }
};

function CommissionsList() {
  const { user } = useAuth()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);

  // Buscar comissões
  const fetchCommissions = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          id,
          commission_amount,
          commission_type,
          payment_status,
          created_at,
          paid_at,
          status_changed_at,
          approval_notes,
          user_id
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCommissions(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Atualizar status de comissão
  const updateCommissionStatus = async (commissionId: string, status: string) => {
    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('commissions')
        .update({ 
          payment_status: status,
          status_changed_at: new Date().toISOString()
        })
        .eq('id', commissionId)

      if (error) throw error
      
      // Atualizar lista
      fetchCommissions()
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchCommissions()
    }
  }, [user])

  const handleApplyFilters = () => {
    fetchCommissions();
  };

  const handleStatusChange = async () => {
    if (!selectedCommission || !newStatus) return;
    
    try {
      await updateCommissionStatus(selectedCommission.id, newStatus);
      
      setShowStatusModal(false);
      setSelectedCommission(null);
      setNewStatus('');
      setApprovalNotes('');
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const handleBulkStatusChange = async () => {
    if (selectedCommissions.length === 0 || !newStatus) return;
    
    try {
      // Implementar atualização em lote usando a API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commission-management-advanced?action=bulk_update_status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commission_ids: selectedCommissions,
            new_status: newStatus,
            approval_notes: approvalNotes
          }),
        }
      );

      if (response.ok) {
        fetchCommissions(); // Recarregar dados
        setSelectedCommissions([]);
        setShowBulkStatusModal(false);
        setNewStatus('');
        setApprovalNotes('');
      }
    } catch (error) {
      console.error('Erro na atualização em lote:', error);
    }
  };

  const toggleCommissionSelection = (commissionId: string) => {
    setSelectedCommissions(prev => 
      prev.includes(commissionId)
        ? prev.filter(id => id !== commissionId)
        : [...prev, commissionId]
    );
  };

  const selectAllCommissions = () => {
    if (selectedCommissions.length === commissions.length) {
      setSelectedCommissions([]);
    } else {
      setSelectedCommissions(commissions.map((c: Commission) => c.id));
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <strong>Erro:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comissões</h1>
          <p className="text-gray-600">Gerencie o status de todas as comissões</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedCommissions.length > 0 && (
            <button
              onClick={() => setShowBulkStatusModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Alterar Status ({selectedCommissions.length})
            </button>
          )}
          
          {/* Filtros simplificados removidos para estabilidade */}
        </div>
      </div>

      {/* Lista de Comissões */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Carregando comissões...</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCommissions.length === commissions.length && commissions.length > 0}
                      onChange={selectAllCommissions}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beneficiário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissions.map((commission: Commission) => (
                  <tr key={commission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCommissions.includes(commission.id)}
                        onChange={() => toggleCommissionSelection(commission.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Usuário ID: {commission.user_id || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Comissão
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Informação não disponível
                        </div>
                        <div className="text-sm text-gray-500">
                          Tipo: {getCommissionTypeLabel(commission.commission_type)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(commission.commission_amount || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(commission.commission_amount)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {getCommissionTypeLabel(commission.commission_type)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(commission.payment_status)}`}>
                        {getStatusLabel(commission.payment_status)}
                      </span>
                      {commission.approval_notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          {commission.approval_notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                          <span>Criado: {formatDate(commission.created_at)}</span>
                        </div>
                        {commission.paid_at && (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <span>Pago: {formatDate(commission.paid_at)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {getStatusActions(commission.payment_status).map((action) => {
                          const getActionIcon = (actionType: string) => {
                            switch (actionType) {
                              case 'processing': return <Clock className="h-4 w-4" />;
                              case 'approved': case 'paid': return <CheckCircle className="h-4 w-4" />;
                              case 'rejected': case 'canceled': return <XCircle className="h-4 w-4" />;
                              default: return <Clock className="h-4 w-4" />;
                            }
                          };
                          
                          const getActionColor = (actionType: string) => {
                            switch (actionType) {
                              case 'approved': case 'paid': return 'text-green-600 hover:text-green-900';
                              case 'rejected': case 'canceled': return 'text-red-600 hover:text-red-900';
                              default: return 'text-blue-600 hover:text-blue-900';
                            }
                          };
                          
                          return (
                            <button
                              key={action}
                              onClick={() => {
                                setSelectedCommission(commission);
                                setNewStatus(action);
                                setShowStatusModal(true);
                              }}
                              className={getActionColor(action)}
                              title={`Marcar como ${getStatusLabel(action)}`}
                            >
                              {getActionIcon(action)}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {commissions.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma comissão encontrada</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Alteração de Status */}
      {showStatusModal && selectedCommission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Alterar Status da Comissão
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Beneficiário:</strong> ID {selectedCommission.user_id}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Valor:</strong> {formatCurrency(selectedCommission.commission_amount)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Status Atual:</strong> {getStatusLabel(selectedCommission.payment_status)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Novo Status:</strong> {getStatusLabel(newStatus)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Observações sobre a alteração..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedCommission(null);
                  setNewStatus('');
                  setApprovalNotes('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleStatusChange}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Confirmar Alteração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alteração em Lote */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Alterar Status em Lote
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Comissões selecionadas:</strong> {selectedCommissions.length}
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Novo Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecionar status...</option>
                  <option value="processing">Processando</option>
                  <option value="approved">Aprovado</option>
                  <option value="paid">Pago</option>
                  <option value="rejected">Rejeitado</option>
                  <option value="canceled">Cancelado</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Observações sobre a alteração em lote..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowBulkStatusModal(false);
                  setNewStatus('');
                  setApprovalNotes('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkStatusChange}
                disabled={!newStatus}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Aplicar a Todas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommissionsList;