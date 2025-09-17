import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../Layout/AppLayout';

interface User {
  id: string;
  email: string;
  name: string;
  user_type: 'Global' | 'Master' | 'Escritório' | 'Head' | 'Investidor';
  parent_id: string | null;
  phone: string | null;
  document: string | null; // Temporário - será migrado para cpf
  cpf?: string | null; // Novo campo (opcional até migração)
  pix?: string | null; // Novo campo (opcional até migração)
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    user_type: 'Investidor' as User['user_type'],
    parent_id: '',
    phone: '',
    cpf: '', // Usando campo CPF correto
    pix: '', // Usando campo PIX correto
    status: 'active' as User['status']
  });

  // Carregar usuários
  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Criar usuário
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('🔐 Criando usuário:', formData.email)

      // Usar service_role_key para criar usuário no Auth
      const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0NzY3MywiZXhwIjoyMDY5MjIzNjczfQ.dc0ckvRcSVxbo0OHKfTwMlOI8SI8kZSB4zXhbZ5y1yU'
      const SUPABASE_URL = 'https://cisoewbdzdxombthxqfi.supabase.co'
      
      // Criar usuário no Supabase Auth usando service_role
      const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          email_confirm: true
        })
      })

      if (!authResponse.ok) {
        const authError = await authResponse.text()
        throw new Error(`Erro ao criar usuário no Auth: ${authError}`)
      }

      const authUser = await authResponse.json()
      console.log('✅ Usuário criado no Auth:', authUser.id)

      // Criar registro na tabela users usando service_role
      const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: authUser.id,
          email: formData.email,
          name: formData.name,
          user_type: formData.user_type,
          parent_id: formData.parent_id || null,
          phone: formData.phone || null,
          cpf: formData.cpf || null,
          pix: formData.pix || null,
          created_by: user?.id || null
        })
      })

      if (!userResponse.ok) {
        const userError = await userResponse.text()
        // Se falhar na tabela users, deletar do Auth
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY
          }
        })
        throw new Error(`Erro ao criar registro do usuário: ${userError}`)
      }

      console.log('✅ Usuário criado com sucesso')
      
      // Recarregar lista de usuários
      await loadUsers()
      
      // Resetar formulário
      setFormData({
        email: '',
        name: '',
        password: '',
        user_type: 'Investidor',
        parent_id: '',
        phone: '',
        cpf: '',
        pix: '',
        status: 'active'
      })
      setShowForm(false)
      
    } catch (error: any) {
      console.error('❌ Erro ao criar usuário:', error.message)
      alert(`Erro ao criar usuário: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Editar usuário
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: '', // Não mostrar senha existente
      user_type: user.user_type,
      parent_id: user.parent_id || '',
      phone: user.phone || '',
      cpf: user.cpf || '', // Usando campo CPF correto
      pix: user.pix || '', // Usando campo PIX correto
      status: user.status
    });
    setShowForm(true);
  };

  // Atualizar usuário
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      // Atualizar dados na tabela users
      const updateData: any = {
        email: formData.email,
        name: formData.name,
        user_type: formData.user_type,
        parent_id: formData.parent_id || null,
        phone: formData.phone || null,
        cpf: formData.cpf || null, // Usando campo CPF correto
        pix: formData.pix || null, // Usando campo PIX correto
        status: formData.status
      };

      const { error: profileError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Se uma nova senha foi fornecida, atualizar no Auth
      if (formData.password.trim()) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          editingUser.id,
          { password: formData.password }
        );
        if (authError) throw authError;
      }

      setShowForm(false);
      setEditingUser(null);
      setFormData({
        email: '',
        name: '',
        password: '',
        user_type: 'Investidor',
        parent_id: '',
        phone: '',
        cpf: '',
        pix: '',
        status: 'active'
      });
      loadUsers();
      alert('Usuário atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro ao atualizar usuário: ' + (error as any).message);
    }
  };

  // Deletar usuário
  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      loadUsers();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      alert('Erro ao deletar usuário');
    }
  };

  // Cancelar formulário
  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      email: '',
      name: '',
      password: '',
      user_type: 'Investidor',
      parent_id: '',
      phone: '',
      cpf: '',
      pix: '',
      status: 'active'
    });
  };

  // Obter usuários disponíveis como superior hierárquico baseado na hierarquia
  const getAvailableParents = () => {
    const selectedUserType = formData.user_type;
    
    // Filtrar usuários baseado na hierarquia correta
    let availableUsers = users.filter(u => u.id !== editingUser?.id);
    
    switch (selectedUserType) {
      case 'Master':
        // Master só pode ter Global como superior
        availableUsers = availableUsers.filter(u => u.user_type === 'Global');
        break;
      case 'Escritório':
        // Escritório só pode ter Master como superior
        availableUsers = availableUsers.filter(u => u.user_type === 'Master');
        break;
      case 'Head':
        // Head só pode ter Escritório como superior
        availableUsers = availableUsers.filter(u => u.user_type === 'Escritório');
        break;
      case 'Agente':
        // Agente só pode ter Head como superior
        availableUsers = availableUsers.filter(u => u.user_type === 'Head');
        break;
      case 'Investidor':
        // Investidor pode ter qualquer tipo como superior
        availableUsers = availableUsers;
        break;
      default:
        availableUsers = availableUsers;
    }
    
    return availableUsers;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="py-2">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie usuários do sistema com controle hierárquico</p>
        </div>

        {/* Header com botão */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Usuários ({users.length})</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            
            <form onSubmit={editingUser ? handleUpdate : handleCreate} className="space-y-4">
              {/* Grid de 2 colunas para campos principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Usuário
                  </label>
                  <select
                    value={formData.user_type}
                    onChange={(e) => setFormData({
                      ...formData, 
                      user_type: e.target.value as User['user_type'],
                      parent_id: '' // Reset superior hierárquico quando muda o tipo
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Investidor">Investidor</option>
                    <option value="Agente">Agente</option>
                    <option value="Head">Head</option>
                    <option value="Escritório">Escritório</option>
                    <option value="Master">Master</option>
                    <option value="Global">Global</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Superior Hierárquico
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhum</option>
                  {getAvailableParents().map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.user_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIX
                </label>
                <input
                  type="text"
                  value={formData.pix}
                  onChange={(e) => setFormData({...formData, pix: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Chave PIX (CPF, email, telefone ou chave aleatória)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as User['status']})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="suspended">Suspenso</option>
                </select>
              </div>
            </div>

            {/* Campo senha em linha separada para destaque */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha {editingUser && <span className="text-sm text-gray-500">(deixe em branco para manter a atual)</span>}
              </label>
              <input
                type="password"
                required={!editingUser}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={editingUser ? "Nova senha (opcional)" : "Digite a senha"}
              />
            </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                >
                  {editingUser ? 'Atualizar' : 'Criar'}
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

      {/* Lista de usuários */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Usuários ({users.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {user.user_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' :
                      user.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.status === 'active' ? 'Ativo' : 
                       user.status === 'inactive' ? 'Inativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default UserManagement;

