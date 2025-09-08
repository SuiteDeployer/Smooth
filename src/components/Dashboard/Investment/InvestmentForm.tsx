import React, { useState, useEffect } from 'react';
import { Investment, UserOption, SeriesOption } from '../../../hooks/useAdminInvestments';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface InvestmentFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  users: UserOption[];
  series: SeriesOption[];
  loadingOptions: boolean;
}

export const InvestmentForm: React.FC<InvestmentFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  users,
  series,
  loadingOptions
}) => {
  const [formData, setFormData] = useState({
    series_id: '',
    investor_user_id: '',
    assessor_user_id: '',
    invested_amount: '',
    investment_date: '',
    status: 'ativo', // Sistema simplificado - sempre ativo ao criar
    commission_master: '0',
    commission_escritorio: '0',
    commission_assessor: '0'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // REMOVIDO: Sistema simplificado não permite edição de investimentos

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    console.log('🔍 Iniciando validação do formulário');
    console.log('📋 Dados a validar:', formData);

    if (!formData.series_id) {
      console.log('❌ Série não selecionada');
      newErrors.series_id = 'Série é obrigatória';
    } else {
      console.log('✅ Série selecionada:', formData.series_id);
    }

    if (!formData.investor_user_id) {
      console.log('❌ Investidor não selecionado');
      newErrors.investor_user_id = 'Investidor é obrigatório';
    } else {
      console.log('✅ Investidor selecionado:', formData.investor_user_id);
    }

    if (!formData.assessor_user_id) {
      console.log('❌ Assessor não selecionado');
      newErrors.assessor_user_id = 'Assessor é obrigatório';
    } else {
      console.log('✅ Assessor selecionado:', formData.assessor_user_id);
    }

    const investedAmount = parseFloat(formData.invested_amount);
    if (!formData.invested_amount || investedAmount <= 0) {
      console.log('❌ Valor do investimento inválido:', formData.invested_amount);
      newErrors.invested_amount = 'Valor do investimento deve ser maior que zero';
    } else {
      console.log('✅ Valor do investimento válido:', formData.invested_amount);
      
      // Validar investimento mínimo baseado na série selecionada
      if (formData.series_id) {
        const selectedSeries = getSelectedSeries();
        if (selectedSeries && selectedSeries.minimum_investment) {
          const minimumInvestment = parseFloat(selectedSeries.minimum_investment.toString());
          if (investedAmount < minimumInvestment) {
            console.log('❌ Valor abaixo do mínimo da série:', investedAmount, 'mínimo:', minimumInvestment);
            newErrors.invested_amount = `Valor mínimo para esta série: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minimumInvestment)}`;
          }
        }
      }
    }

    if (!formData.investment_date) {
      console.log('❌ Data do investimento não preenchida');
      newErrors.investment_date = 'Data do investimento é obrigatória';
    } else {
      console.log('✅ Data do investimento preenchida:', formData.investment_date);
    }



    // Validar comissões se uma série foi selecionada
    if (formData.series_id) {
      const selectedSeries = getSelectedSeries();
      if (selectedSeries) {
        const totalCommissions = 
          (parseFloat(formData.commission_master) || 0) +
          (parseFloat(formData.commission_escritorio) || 0) +
          (parseFloat(formData.commission_assessor) || 0);
        
        if (totalCommissions > selectedSeries.max_commission_percentage) {
          newErrors.commission_total = `A soma das comissões (${totalCommissions.toFixed(2)}%) não pode exceder a comissão total da série (${selectedSeries.max_commission_percentage}%)`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função helper para obter a série selecionada
  const getSelectedSeries = () => {
    return series.find(s => s.id === formData.series_id);
  };

  // Calcular total de comissões
  const getTotalCommissions = () => {
    return (parseFloat(formData.commission_master) || 0) +
           (parseFloat(formData.commission_escritorio) || 0) +
           (parseFloat(formData.commission_assessor) || 0);
  };

  // Calcular data de vencimento (prazo) baseada na série selecionada
  const calculateMaturityDate = () => {
    if (!formData.investment_date || !formData.series_id) return '';
    
    const selectedSeries = getSelectedSeries();
    if (!selectedSeries) return '';
    
    const durationMonths = selectedSeries.duration_months || selectedSeries.maturity_period_months;
    if (!durationMonths) return '';
    
    const investmentDate = new Date(formData.investment_date);
    const maturityDate = new Date(investmentDate);
    maturityDate.setMonth(maturityDate.getMonth() + durationMonths);
    
    return maturityDate.toLocaleDateString('pt-BR');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Iniciando submissão do formulário');
    console.log('📋 Dados do formulário:', formData);
    console.log('👥 Usuários disponíveis:', users.length);
    console.log('📊 Séries disponíveis:', series.length);

    // Fechar popup de erro anterior se existir
    setShowErrorPopup(false);
    setErrorMessage('');

    if (!validateForm()) {
      console.log('❌ Validação falhou. Erros:', errors);
      console.log('📋 Estado atual do formulário:', formData);
      
      // Exibir popup com erros de validação
      const errorList = Object.values(errors).join('\n• ');
      setErrorMessage(`Por favor, corrija os seguintes erros:\n\n• ${errorList}`);
      setShowErrorPopup(true);
      
      // Scroll para o primeiro erro
      const firstErrorElement = document.querySelector('.text-red-600');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    console.log('✅ Validação passou, prosseguindo com submissão');

    try {
      // Calcular a data de vencimento automaticamente
      const selectedSeries = getSelectedSeries();
      let maturityDate = '';
      if (formData.investment_date && selectedSeries) {
        const durationMonths = selectedSeries.duration_months || selectedSeries.maturity_period_months;
        if (durationMonths) {
          const investDate = new Date(formData.investment_date);
          const maturity = new Date(investDate);
          maturity.setMonth(maturity.getMonth() + durationMonths);
          maturityDate = maturity.toISOString().split('T')[0];
        }
      }

      const submitData = {
        series_id: formData.series_id,
        investor_user_id: formData.investor_user_id,
        assessor_user_id: formData.assessor_user_id,
        invested_amount: parseFloat(formData.invested_amount),
        investment_date: formData.investment_date,
        maturity_date: maturityDate,
        status: formData.status,
        // Campos necessários para o backend
        interest_type: 'fixed', // Valor padrão
        interest_rate: 0, // Valor padrão
        commission_master: parseFloat(formData.commission_master) || 0,
        commission_escritorio: parseFloat(formData.commission_escritorio) || 0,
        commission_assessor: parseFloat(formData.commission_assessor) || 0
      };

      console.log('📤 Enviando dados:', submitData);
      await onSubmit(submitData);
      
      // Se chegou até aqui, foi sucesso - fechar popup se estiver aberto
      setShowErrorPopup(false);
      setErrorMessage('');
      
    } catch (error: any) {
      console.error('❌ Erro ao enviar formulário:', error);
      
      // Exibir popup com erro específico
      let errorMsg = 'Erro inesperado ao criar investimento.';
      
      if (error?.message) {
        errorMsg = error.message;
      } else if (error?.error?.message) {
        errorMsg = error.error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      
      setErrorMessage(`Erro ao criar investimento:\n\n${errorMsg}\n\nTente novamente ou entre em contato com o suporte.`);
      setShowErrorPopup(true);
    }
  };

  // Filtrar investidores e assessores
  const investors = users.filter(user => user.role_name === 'Investidor');
  const assessors = users.filter(user => ['Assessor', 'Escritório', 'Master', 'Global'].includes(user.role_name));

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando opções...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Popup de Erro */}
      {showErrorPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Erro na Criação do Investimento
                </h3>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {errorMessage}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowErrorPopup(false)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Banner de erro geral */}
        {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Por favor, corrija os seguintes erros:
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(errors).map(([field, message]) => (
                    <li key={field}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Série */}
        <div className="space-y-2">
          <Label htmlFor="series_id">Série *</Label>
          <select
            id="series_id"
            value={formData.series_id}
            onChange={(e) => handleInputChange('series_id', e.target.value)}
            disabled={isLoading}
            className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Selecione uma série</option>
            {series && series.length > 0 ? (
              series.map((serie) => (
                <option key={serie.id} value={serie.id}>
                  {serie.series_name} - {serie.debenture_name} ({serie.issuer_name})
                </option>
              ))
            ) : (
              <option value="" disabled>Nenhuma série disponível</option>
            )}
          </select>
          {errors.series_id && (
            <p className="text-sm text-red-600">{errors.series_id}</p>
          )}
          
          {/* Mostrar comissão total da série quando selecionada */}
          {formData.series_id && (() => {
            const selectedSeries = getSelectedSeries();
            return selectedSeries ? (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 font-medium">
                  Comissão Total da Série: {selectedSeries.max_commission_percentage}%
                </p>
              </div>
            ) : null;
          })()}
        </div>

        {/* Investidor */}
        <div className="space-y-2">
          <Label htmlFor="investor_user_id">Investidor *</Label>
          <Select
            value={formData.investor_user_id}
            onValueChange={(value) => handleInputChange('investor_user_id', value)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full bg-white border border-gray-300 text-gray-900">
              <SelectValue placeholder="Selecione um investidor" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-300 shadow-lg">
              {investors.map((investor) => (
                <SelectItem 
                  key={investor.id} 
                  value={investor.id}
                  className="bg-white text-gray-900 hover:bg-gray-100 cursor-pointer"
                >
                  {investor.full_name} ({investor.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.investor_user_id && (
            <p className="text-sm text-red-600">{errors.investor_user_id}</p>
          )}
        </div>

        {/* Assessor */}
        <div className="space-y-2">
          <Label htmlFor="assessor_user_id">Assessor *</Label>
          <Select
            value={formData.assessor_user_id}
            onValueChange={(value) => handleInputChange('assessor_user_id', value)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full bg-white border border-gray-300 text-gray-900">
              <SelectValue placeholder="Selecione um assessor" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-300 shadow-lg">
              {assessors.map((assessor) => (
                <SelectItem 
                  key={assessor.id} 
                  value={assessor.id}
                  className="bg-white text-gray-900 hover:bg-gray-100 cursor-pointer"
                >
                  {assessor.full_name} - {assessor.role_name} ({assessor.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.assessor_user_id && (
            <p className="text-sm text-red-600">{errors.assessor_user_id}</p>
          )}
        </div>

        {/* Valor do Investimento */}
        <div className="space-y-2">
          <Label htmlFor="invested_amount">Valor do Investimento (R$) *</Label>
          <Input
            id="invested_amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.invested_amount}
            onChange={(e) => handleInputChange('invested_amount', e.target.value)}
            placeholder="0,00"
            disabled={isLoading}
          />
          {errors.invested_amount && (
            <p className="text-sm text-red-600">{errors.invested_amount}</p>
          )}
          {/* Mostrar investimento mínimo da série selecionada */}
          {formData.series_id && (() => {
            const selectedSeries = getSelectedSeries();
            return selectedSeries && selectedSeries.minimum_investment ? (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-800">
                  💡 Investimento mínimo desta série: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(selectedSeries.minimum_investment.toString()))}
                </p>
              </div>
            ) : null;
          })()}
        </div>

        {/* Data do Investimento */}
        <div className="space-y-2">
          <Label htmlFor="investment_date">Data do Investimento *</Label>
          <Input
            id="investment_date"
            type="date"
            value={formData.investment_date}
            onChange={(e) => handleInputChange('investment_date', e.target.value)}
            disabled={isLoading}
          />
          {errors.investment_date && (
            <p className="text-sm text-red-600">{errors.investment_date}</p>
          )}
        </div>

        {/* Prazo (Data de Vencimento Calculada) */}
        <div className="space-y-2">
          <Label>Prazo (Vencimento)</Label>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <span className="text-gray-600">
              {calculateMaturityDate() || 'Selecione a série e data do investimento'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Calculado automaticamente: Data do investimento + prazo da série em meses
          </p>
        </div>





        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => handleInputChange('status', value)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full bg-white border border-gray-300 text-gray-900">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-300 shadow-lg">
              <SelectItem value="active" className="bg-white text-gray-900 hover:bg-gray-100 cursor-pointer">
                Ativo
              </SelectItem>
              <SelectItem value="pending" className="bg-white text-gray-900 hover:bg-gray-100 cursor-pointer">
                Pendente
              </SelectItem>
              <SelectItem value="redeemed" className="bg-white text-gray-900 hover:bg-gray-100 cursor-pointer">
                Liquidado
              </SelectItem>
              <SelectItem value="canceled" className="bg-white text-gray-900 hover:bg-gray-100 cursor-pointer">
                Cancelado
              </SelectItem>
            </SelectContent>
          </Select>
        </div>


      </div>

      {/* Seção de Comissões */}
      {formData.series_id && (() => {
        const selectedSeries = getSelectedSeries();
        const totalCommissions = getTotalCommissions();
        const remainingCommission = selectedSeries ? selectedSeries.max_commission_percentage - totalCommissions : 0;
        
        return (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Distribuição de Comissões</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Comissão Master */}
              <div className="space-y-2">
                <Label htmlFor="commission_master">Comissão Master (%)</Label>
                <Input
                  id="commission_master"
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedSeries?.max_commission_percentage || 100}
                  value={formData.commission_master}
                  onChange={(e) => handleInputChange('commission_master', e.target.value)}
                  placeholder="0,00"
                  disabled={isLoading}
                />
              </div>

              {/* Comissão Escritório */}
              <div className="space-y-2">
                <Label htmlFor="commission_escritorio">Comissão Escritório (%)</Label>
                <Input
                  id="commission_escritorio"
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedSeries?.max_commission_percentage || 100}
                  value={formData.commission_escritorio}
                  onChange={(e) => handleInputChange('commission_escritorio', e.target.value)}
                  placeholder="0,00"
                  disabled={isLoading}
                />
              </div>

              {/* Comissão Assessor */}
              <div className="space-y-2">
                <Label htmlFor="commission_assessor">Comissão Assessor (%)</Label>
                <Input
                  id="commission_assessor"
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedSeries?.max_commission_percentage || 100}
                  value={formData.commission_assessor}
                  onChange={(e) => handleInputChange('commission_assessor', e.target.value)}
                  placeholder="0,00"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {/* Resumo das comissões */}
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Total Comissões:</span>
                <span className={`text-sm font-bold ${totalCommissions > (selectedSeries?.max_commission_percentage || 0) ? 'text-red-600' : 'text-green-600'}`}>
                  {totalCommissions.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Limite da Série:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedSeries?.max_commission_percentage || 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Comissão Restante:</span>
                <span className={`text-sm font-medium ${remainingCommission < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {remainingCommission.toFixed(2)}%
                </span>
              </div>
            </div>
            
            {/* Erro de validação de comissão */}
            {errors.commission_total && (
              <p className="text-sm text-red-600 mt-2">{errors.commission_total}</p>
            )}
          </div>
        );
      })()}

      {/* Botões de Ação - Fixos na parte inferior */}
      <div className="sticky bottom-0 bg-white mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </div>
            ) : (
              'Criar Investimento'
            )}
          </Button>
        </div>
      </div>
    </form>
    </>
  );
};

export default InvestmentForm;
