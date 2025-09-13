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

const DebentureManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [debentures, setDebentures] = useState<Debenture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDebenture, setEditingDebenture] = useState<Debenture | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    total_amount: '',
    issuer: '',
    status: 'Ativa' as Debenture['status']
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isGlobalUser) {
      toast.error('Apenas usuários Global podem criar debêntures');
      return;
    }

    try {
      const { error } = await supabase
        .from('debentures')
        .insert([{
          name: formData.name,
          total_amount: parseFloat(formData.total_amount.replace(/[^\d,]/g, '').replace(',', '.')),
          issuer: formData.issuer,
          status: formData.status,
          created_by: userProfile?.id
        }]);

      if (error) throw error;

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

  const resetForm = () => {
    setFormData({
      name: '',
      total_amount: '',
      issuer: '',
      status: 'Ativa'
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDebenture(null);
    resetForm();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativa':
        return 'bg-green-100 text-green-800';
      case 'Inativa':
        return 'bg-red-100 text-red-800';
      case 'Finalizada':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Carregando debêntures...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-2">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Debêntures</h1>
          <p className="text-gray-600 mt-1">
            {isGlobalUser 
              ? 'Gerencie debêntures do sistema' 
              : 'Visualize debêntures do sistema (somente leitura)'
            }
          </p>
        </div>

        {/* Header com botão */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Debêntures ({debentures.length})</h2>
          {isGlobalUser && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Nova Debênture
            </button>
          )}
        </div>

        {/* Tabela de debêntures */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debênture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Captação Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emitente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                {isGlobalUser && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {debentures.map((debenture) => (
                <tr key={debenture.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{debenture.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(debenture.total_amount)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{debenture.issuer}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(debenture.status)}`}>
                      {debenture.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(debenture.created_at)}
                  </td>
                  {isGlobalUser && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => navigate(`/debentures/${debenture.id}/series`)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Séries
                      </button>
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
                  {!isGlobalUser && canViewDebentures && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/debentures/${debenture.id}/series`)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Ver Séries
                      </button>
                    </td>
                  )}
                </tr>
              ))}
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

        {/* Modal de formulário */}
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
                    <option value="Ativa">Ativa</option>
                    <option value="Inativa">Inativa</option>
                    <option value="Finalizada">Finalizada</option>
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
      </div>
    </AppLayout>
  );
};

export default DebentureManagement;

