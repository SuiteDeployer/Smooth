import React, { useState } from 'react';
import { useAdminInvestments, Investment } from '../../hooks/useAdminInvestments';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import InvestmentStatusBadge from '../common/InvestmentStatusBadge';
import ActionButtons, { COMMON_ACTIONS } from '../common/ActionButtons';
import InvestmentForm from './Investment/InvestmentForm';
import { Plus, X } from 'lucide-react';

const InvestmentDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const { investments, loading, error, users, series, loadingOptions, loadInvestments, createInvestment, deleteInvestment } = useAdminInvestments();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  console.log('🔄 InvestmentDashboard renderizado, showCreateForm:', showCreateForm);
  // REMOVIDO: Estado de edição - sistema simplificado não permite edição
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [formLoading, setFormLoading] = useState(false);

  // Funções auxiliares para extrair dados dos relacionamentos
  const getDebenture = (investment: Investment) => {
    const series = Array.isArray(investment.series) ? investment.series[0] : investment.series;
    if (!series) return null;
    return Array.isArray(series.debentures) ? series.debentures[0] : series.debentures || null;
  };

  const getSeries = (investment: Investment) => {
    return Array.isArray(investment.series) ? investment.series[0] : investment.series || null;
  };

  const getInvestorUser = (investment: Investment) => {
    return Array.isArray(investment.investor_user) ? investment.investor_user[0] : investment.investor_user || null;
  };

  const getAssessorUser = (investment: Investment) => {
    return Array.isArray(investment.assessor_user) ? investment.assessor_user[0] : investment.assessor_user || null;
  };

  // Filtros
  const filteredInvestments = investments.filter(investment => {
    const investor = getInvestorUser(investment);
    const assessor = getAssessorUser(investment);
    const debenture = getDebenture(investment);
    
    const matchesSearch = !searchTerm || 
      investor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investor?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessor?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debenture?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debenture?.issuer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || investment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Estatísticas - Sistema Simplificado
  const stats = {
    total: investments.length,
    totalValue: investments.reduce((sum, inv) => sum + inv.invested_amount, 0),
    ativo: investments.filter(inv => inv.status === 'ativo').length,
    liquidado: investments.filter(inv => inv.status === 'liquidado').length
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

  const calculatePrazo = (investment: Investment) => {
    const series = getSeries(investment);
    if (!series || !series.duration_months) return 'N/A';
    
    const months = series.duration_months;
    if (months < 12) {
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths === 0) {
        return `${years} ${years === 1 ? 'ano' : 'anos'}`;
      } else {
        return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
      }
    }
  };

  // Funções do formulário
  const handleCreateNew = () => {
    console.log('🚀 BOTÃO CLICADO: handleCreateNew executado');
    console.log('📋 Estado atual showCreateForm:', showCreateForm);
    setShowCreateForm(true);
    console.log('✅ showCreateForm definido como true');
  };

  // REMOVIDO: Função de edição - sistema simplificado não permite edição

  const handleDelete = async (investment: Investment) => {
    console.log('🗑️ Tentando excluir investimento:', investment.id);
    
    const investorName = getInvestorUser(investment)?.full_name || 'Investidor';
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir o investimento de ${investorName}?`);
    
    console.log('📋 Resultado da confirmação:', confirmDelete);
    
    if (confirmDelete) {
      try {
        console.log('⏳ Iniciando exclusão do investimento:', investment.id);
        await deleteInvestment(investment.id);
        console.log('✅ Investimento excluído com sucesso');
        alert('Investimento excluído com sucesso!');
      } catch (error) {
        console.error('❌ Erro ao excluir investimento:', error);
        alert('Erro ao excluir investimento. Tente novamente.');
      }
    } else {
      console.log('❌ Exclusão cancelada pelo usuário');
    }
  };

  const handleFormSubmit = async (investmentData: any) => {
    try {
      setFormLoading(true);
      console.log('🚀 Iniciando criação de novo investimento:', investmentData);

      console.log('🆕 Criando novo investimento...');
      await createInvestment(investmentData);
      console.log('✅ Investimento criado e lista recarregada');
      
      // Aguardar um pequeno delay para garantir que a lista foi atualizada na UI
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🎯 Fechando modal e limpando formulário');
      setShowCreateForm(false);
    } catch (error) {
      console.error('❌ Erro ao criar investimento:', error);
      throw error; // Repassar erro para o formulário tratar
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setShowCreateForm(false);
  };

  const handleActionClick = (action: string, investment: Investment) => {
    switch (action) {
      case 'delete':
        handleDelete(investment);
        break;
      default:
        console.log('Ação não reconhecida:', action);
    }
  };



  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando investimentos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar investimentos</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadInvestments} variant="outline">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Investimentos</h1>
          <p className="text-gray-600">
            Área administrativa para gerenciar todos os investimentos - {userProfile?.user_roles?.role_name}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative z-50">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖡️ Click event capturado:', e);
                handleCreateNew();
              }}
              onMouseDown={(e) => {
                console.log('🖡️ Mouse down no botão');
                e.stopPropagation();
              }}
              onMouseUp={(e) => {
                console.log('🖡️ Mouse up no botão');
                e.stopPropagation();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{
                minHeight: '44px',
                position: 'relative',
                zIndex: 999,
                pointerEvents: 'auto',
                touchAction: 'manipulation'
              }}
            >
              <Plus className="w-4 h-4" />
              Novo Investimento
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Investimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.ativo}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Liquidados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.liquidado}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Nome, email, debênture..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="liquidado">Liquidado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Investimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Investimentos ({filteredInvestments.length})</CardTitle>
          <CardDescription>
            Lista de todos os investimentos no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredInvestments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'todos' 
                  ? 'Nenhum investimento encontrado com os filtros aplicados.' 
                  : 'Nenhum investimento cadastrado.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Investidor</th>
                    <th className="text-left p-2">Assessor</th>
                    <th className="text-left p-2">Debênture</th>
                    <th className="text-left p-2">Série</th>
                    <th className="text-left p-2">Valor</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Data Invest.</th>
                    <th className="text-left p-2">Prazo</th>
                    <th className="text-left p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestments.map((investment) => {
                    const investor = getInvestorUser(investment);
                    const assessor = getAssessorUser(investment);
                    const debenture = getDebenture(investment);
                    const series = getSeries(investment);
                    
                    return (
                    <tr key={investment.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{investor?.full_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{investor?.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{assessor?.full_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{assessor?.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{debenture?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{debenture?.issuer_name || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{series?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">
                            Taxa: {series?.interest_rate ? `${series.interest_rate}%` : 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="font-medium text-green-600">
                          {formatCurrency(investment.invested_amount)}
                        </div>
                      </td>
                      <td className="p-2">
                        <InvestmentStatusBadge status={investment.status} />
                      </td>
                      <td className="p-2">
                        <div className="text-sm text-gray-600">
                          {formatDate(investment.investment_date)}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="text-sm text-gray-600 font-medium">
                          {calculatePrazo(investment)}
                        </div>
                      </td>
                      <td className="p-2">
                        <ActionButtons
                          actions={[
                            { ...COMMON_ACTIONS.DELETE, key: 'delete' }
                          ]}
                          onAction={(action) => handleActionClick(action, investment)}
                          variant="buttons"
                          size="sm"
                        />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      {(() => {
        console.log('🔍 Renderizando modal? showCreateForm =', showCreateForm);
        return null;
      })()}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                Novo Investimento
              </h2>
              <button
                onClick={handleFormCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <InvestmentForm
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                isLoading={formLoading}
                users={users}
                series={series}
                loadingOptions={loadingOptions}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentDashboard;
