import React, { useState } from 'react'
import toast from 'react-hot-toast'

interface SimpleFormData {
  email: string
  full_name: string
  role_name: string
}

const TestUserForm = () => {
  const [formData, setFormData] = useState<SimpleFormData>({
    email: '',
    full_name: '',
    role_name: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  
  const availableRoles = [
    { role_name: 'Global' },
    { role_name: 'Master' },
    { role_name: 'Escritório' },
    { role_name: 'Assessor' },
    { role_name: 'Investidor' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação simples
    if (!formData.full_name.trim()) {
      toast.error('Nome completo é obrigatório.')
      return
    }
    
    if (!formData.email.trim()) {
      toast.error('Email é obrigatório.')
      return
    }
    
    if (!formData.role_name) {
      toast.error('Tipo de usuário é obrigatório.')
      return
    }
    
    setIsLoading(true)
    
    // Timeout de segurança
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ Timeout de segurança: resetando estado de loading')
      setIsLoading(false)
    }, 30000)
    
    try {
      // Simular erro para testar o comportamento
      if (formData.email === 'erro@test.com') {
        throw new Error('Email já existe no sistema')
      }
      
      // Simular sucesso
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Usuário criado com sucesso!')
      
      // Resetar formulário
      setFormData({
        email: '',
        full_name: '',
        role_name: ''
      })
    } catch (error: any) {
      console.error('❌ Erro ao criar usuário:', error)
      const errorMessage = error?.message || 'Erro ao criar usuário. Verifique os dados e tente novamente.'
      toast.error(errorMessage)
    } finally {
      // Limpar o timeout de segurança
      clearTimeout(safetyTimeout)
      // CRÍTICO: Sempre resetar o estado de loading
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Teste: Criar Usuário</h2>
      <p className="text-sm text-gray-600 mb-4">
        Para testar erro: use email "erro@test.com"
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="test_full_name" className="block text-sm font-medium text-gray-700">
            Nome Completo
          </label>
          <input
            id="test_full_name"
            name="test_full_name"
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite o nome completo"
          />
        </div>

        <div>
          <label htmlFor="test_email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="test_email"
            name="test_email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite o email"
          />
        </div>

        <div>
          <label htmlFor="test_role_name" className="block text-sm font-medium text-gray-700">
            Tipo de Usuário
          </label>
          <select
            id="test_role_name"
            name="test_role_name"
            required
            value={formData.role_name}
            onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecione...</option>
            {availableRoles.map(role => (
              <option key={role.role_name} value={role.role_name}>
                {role.role_name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Criando...' : 'Criar Usuário de Teste'}
          </button>
        </div>
      </form>
      
      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Status do Loading:</strong> {isLoading ? 'ATIVO' : 'INATIVO'}</p>
        <p><strong>Valores do Form:</strong></p>
        <pre>{JSON.stringify(formData, null, 2)}</pre>
      </div>
    </div>
  )
}

export default TestUserForm
