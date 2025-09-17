// smooth-platform/src/components/UserForm.tsx
// RECONSTRUÇÃO COMPLETA - Componente Simplificado
// Data: 2025-08-21 - Autor: MiniMax Agent

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface UserFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  email: string;
  full_name: string;
  role_name: string;
  cpf_cnpj?: string;
  phone?: string;
  company_name?: string;
  superior_user_id?: string;
  pix?: string;
  pix_key_type?: string;
}

interface SuperiorUser {
  id: string;
  full_name: string;
  role_name: string;
}

const ROLE_OPTIONS = [
  { value: 'Global', label: 'Global' },
  { value: 'Master', label: 'Master' },
  { value: 'Escritório', label: 'Escritório' },
  { value: 'Head', label: 'Head' },
  { value: 'Investidor', label: 'Investidor' }
];

const PIX_TYPE_OPTIONS = [
  { value: 'cpf_cnpj', label: 'CPF/CNPJ' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random_key', label: 'Chave Aleatória' }
];

export const UserForm: React.FC<UserFormProps> = ({ onSuccess, onCancel }) => {
  // Estados do formulário
  const [formData, setFormData] = useState<FormData>({
    email: '',
    full_name: '',
    role_name: '',
    cpf_cnpj: '',
    phone: '',
    company_name: '',
    superior_user_id: '',
    pix: '',
    pix_key_type: 'cpf_cnpj'
  });

  // Estados de controle
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [superiorUsers, setSuperiorUsers] = useState<SuperiorUser[]>([]);
  const [loadingSuperiors, setLoadingSuperiors] = useState(false);

  // Função para buscar superiores hierárquicos
  const fetchSuperiors = async (selectedRole: string) => {
    if (!selectedRole || selectedRole === 'Global') {
      setSuperiorUsers([]);
      return;
    }

    setLoadingSuperiors(true);
    
    try {
      const hierarchyMap: Record<string, string[]> = {
        'Master': ['Global'],
        'Escritório': ['Global', 'Master'],
        'Head': ['Global', 'Master', 'Escritório'],
        'Investidor': ['Global', 'Master', 'Escritório', 'Head']
      };

      const validSuperiorRoles = hierarchyMap[selectedRole] || [];
      
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          user_roles!inner (
            role_name
          )
        `)
        .in('user_roles.role_name', validSuperiorRoles)
        .eq('status', 'active');

      if (error) {
        console.error('Erro ao buscar superiores:', error);
        toast.error('Erro ao carregar superiores hierárquicos');
        return;
      }

      const formattedUsers = (users || []).map(user => ({
        id: user.id,
        full_name: user.full_name,
        role_name: (user.user_roles as any)?.role_name || ''
      }));

      setSuperiorUsers(formattedUsers);
      
      // Seleção automática se houver apenas um superior
      if (formattedUsers.length === 1) {
        setFormData(prev => ({
          ...prev,
          superior_user_id: formattedUsers[0].id
        }));
      }

    } catch (error) {
      console.error('Erro ao buscar superiores:', error);
      toast.error('Erro ao carregar superiores hierárquicos');
    } finally {
      setLoadingSuperiors(false);
    }
  };

  // Efeito para buscar superiores quando o role mudar
  useEffect(() => {
    if (formData.role_name) {
      fetchSuperiors(formData.role_name);
      // Limpar superior selecionado ao mudar role
      setFormData(prev => ({ ...prev, superior_user_id: '' }));
    }
  }, [formData.role_name]);

  // Função para atualizar campos do formulário
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo ao digitar
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validação básica
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // VALIDAÇÕES MÍNIMAS conforme solicitado
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.full_name) {
      newErrors.full_name = 'Nome completo é obrigatório';
    }

    if (!formData.role_name) {
      newErrors.role_name = 'Tipo de usuário é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função de submissão
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    console.log('📤 Iniciando submissão do formulário:', formData);
    
    if (!validateForm()) {
      toast.error('Por favor, preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar dados para envio
      const submitData = {
        email: formData.email,
        full_name: formData.full_name,
        role_name: formData.role_name,
        cpf_cnpj: formData.cpf_cnpj || '',
        phone: formData.phone || '',
        company_name: formData.company_name || '',
        superior_user_id: formData.superior_user_id || '',
        pix: formData.pix || '',
        pix_key_type: formData.pix_key_type || 'cpf_cnpj',
        status: 'active'
      };

      console.log('📡 Enviando dados para create-user-v3:', submitData);

      // Chamar a nova edge function
      const { data, error } = await supabase.functions.invoke('create-user-v3', {
        body: submitData
      });

      console.log('📥 Resposta da edge function:', { data, error });

      if (error) {
        console.error('❌ Erro da edge function:', error);
        throw new Error(error.message || 'Erro desconhecido na criação do usuário');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro na criação do usuário');
      }

      // Sucesso!
      const credentials = data.data;
      toast.success(
        `✅ Usuário criado com sucesso!\n\n` +
        `📧 Email: ${credentials.email}\n` +
        `🔐 Senha temporária: ${credentials.temporary_password}\n\n` +
        `⚠️ A senha foi enviada por email`,
        {
          duration: 8000,
          style: {
            background: '#f0fdf4',
            border: '1px solid #16a34a',
            color: '#15803d',
            fontSize: '14px',
            whiteSpace: 'pre-line',
            maxWidth: '500px'
          }
        }
      );

      // Chamar callback de sucesso se fornecido
      onSuccess && onSuccess();
      
      // NÃO limpar o formulário para que o usuário veja os dados
      // Apenas marcar que a submissão foi concluída
      
    } catch (error: any) {
      console.error('💥 Erro na submissão:', error);
      
      // Mensagens de erro específicas
      let errorMessage = 'Erro desconhecido na criação do usuário';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Verificar erros específicos
      if (errorMessage.includes('already exists') || errorMessage.includes('já está em uso')) {
        errorMessage = '❌ Email já está em uso. Tente outro email.';
        setErrors({ email: 'Este email já está em uso' });
      } else if (errorMessage.includes('invalid email')) {
        errorMessage = '❌ Formato de email inválido';
        setErrors({ email: 'Formato de email inválido' });
      }
      
      toast.error(errorMessage, {
        duration: 6000,
        style: {
          background: '#fef2f2',
          border: '1px solid #dc2626',
          color: '#991b1b'
        }
      });
      
      // NÃO limpar campos após erro - manter dados preenchidos
      
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        👤 Criar Novo Usuário
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email - Obrigatório */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="usuario@exemplo.com"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        {/* Nome Completo - Obrigatório */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome Completo *
          </label>
          <input
            type="text"
            id="full_name"
            value={formData.full_name}
            onChange={(e) => handleInputChange('full_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.full_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Nome completo do usuário"
          />
          {errors.full_name && (
            <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
          )}
        </div>

        {/* Tipo de Usuário - Obrigatório */}
        <div>
          <label htmlFor="role_name" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Usuário *
          </label>
          <select
            id="role_name"
            value={formData.role_name}
            onChange={(e) => handleInputChange('role_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.role_name ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Selecione o tipo de usuário</option>
            {ROLE_OPTIONS.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          {errors.role_name && (
            <p className="text-red-500 text-xs mt-1">{errors.role_name}</p>
          )}
        </div>

        {/* Superior Hierárquico */}
        {formData.role_name && formData.role_name !== 'Global' && (
          <div>
            <label htmlFor="superior_user_id" className="block text-sm font-medium text-gray-700 mb-1">
              Superior Hierárquico
            </label>
            <select
              id="superior_user_id"
              value={formData.superior_user_id}
              onChange={(e) => handleInputChange('superior_user_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingSuperiors}
            >
              <option value="">
                {loadingSuperiors ? 'Carregando...' : 'Selecione o superior (opcional)'}
              </option>
              {superiorUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.role_name})
                </option>
              ))}
            </select>
            {superiorUsers.length === 0 && !loadingSuperiors && formData.role_name && (
              <p className="text-amber-600 text-xs mt-1">
                ⚠️ Nenhum superior hierárquico encontrado
              </p>
            )}
          </div>
        )}

        {/* Campos opcionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CPF/CNPJ */}
          <div>
            <label htmlFor="cpf_cnpj" className="block text-sm font-medium text-gray-700 mb-1">
              CPF/CNPJ
            </label>
            <input
              type="text"
              id="cpf_cnpj"
              value={formData.cpf_cnpj || ''}
              onChange={(e) => handleInputChange('cpf_cnpj', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="000.000.000-00"
            />
          </div>

          {/* Telefone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <input
              type="text"
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        {/* Nome da Empresa */}
        <div>
          <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Empresa
          </label>
          <input
            type="text"
            id="company_name"
            value={formData.company_name || ''}
            onChange={(e) => handleInputChange('company_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome da empresa (opcional)"
          />
        </div>

        {/* Seção PIX */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3 text-gray-900">💳 Informações PIX (Opcional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo da Chave PIX */}
            <div>
              <label htmlFor="pix_key_type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo da Chave PIX
              </label>
              <select
                id="pix_key_type"
                value={formData.pix_key_type || 'cpf_cnpj'}
                onChange={(e) => handleInputChange('pix_key_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PIX_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Chave PIX */}
            <div>
              <label htmlFor="pix" className="block text-sm font-medium text-gray-700 mb-1">
                Chave PIX
              </label>
              <input
                type="text"
                id="pix"
                value={formData.pix || ''}
                onChange={(e) => handleInputChange('pix', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Chave PIX (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Botões de Ação - SEMPRE VISÍVEIS */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ❌ Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[120px]"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Criando...
              </span>
            ) : (
              '✅ Criar Usuário'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;