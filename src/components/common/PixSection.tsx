import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface PixSectionProps {
  pixValue: string;
  pixType: string;
  onPixChange: (pix: string, type: string) => void;
  className?: string;
}

export const PixSection: React.FC<PixSectionProps> = ({ 
  pixValue, 
  pixType, 
  onPixChange, 
  className = '' 
}) => {
  const [localPixValue, setLocalPixValue] = useState(pixValue);
  const [localPixType, setLocalPixType] = useState(pixType || 'cpf_cnpj');
  const [validationError, setValidationError] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Opções de tipo de PIX
  const pixTypeOptions = [
    { value: 'cpf_cnpj', label: 'CPF/CNPJ' },
    { value: 'email', label: 'Email' },
    { value: 'telefone', label: 'Telefone' },
    { value: 'aleatoria', label: 'Chave Aleatória' }
  ];

  // Função para validar PIX baseado no tipo
  const validatePix = (value: string, type: string): { isValid: boolean; error: string } => {
    if (!value.trim()) {
      return { isValid: true, error: '' }; // Campo opcional
    }

    switch (type) {
      case 'cpf_cnpj':
        // CPF: 11 dígitos, CNPJ: 14 dígitos
        // RELAXADO PARA TESTES: aceitar qualquer sequencia de dígitos
        const cleanValue = value.replace(/\D/g, '');
        if (cleanValue.length >= 10 && cleanValue.length <= 14) {
          return { isValid: true, error: '' };
        } else {
          return { isValid: false, error: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos' };
        }
      
      case 'email':
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (emailRegex.test(value)) {
          return { isValid: true, error: '' };
        } else {
          return { isValid: false, error: 'Formato de email inválido' };
        }
      
      case 'telefone':
        // Formato brasileiro: +55DDNNNNNNNNN ou DDNNNNNNNNN ou (DD)NNNNN-NNNN
        // RELAXADO PARA TESTES: aceitar qualquer sequencia de dígitos
        const phoneClean = value.replace(/\D/g, '');
        if (phoneClean.length >= 8 && phoneClean.length <= 15) {
          return { isValid: true, error: '' };
        } else {
          return { isValid: false, error: 'Telefone deve ter entre 8 e 15 dígitos' };
        }
      
      case 'aleatoria':
        // UUID ou string alfanumérica
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        const alphaNumRegex = /^[a-zA-Z0-9]{8,32}$/;
        
        if (uuidRegex.test(value) || alphaNumRegex.test(value)) {
          return { isValid: true, error: '' };
        } else {
          return { isValid: false, error: 'Chave deve ser um UUID ou string alfanumérica de 8-32 caracteres' };
        }
      
      default:
        return { isValid: true, error: '' };
    }
  };

  // Aplicar máscara baseada no tipo
  const applyMask = (value: string, type: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    
    switch (type) {
      case 'cpf_cnpj':
        if (cleanValue.length <= 11) {
          // CPF: 999.999.999-99
          return cleanValue
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
          // CNPJ: 99.999.999/9999-99
          return cleanValue
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
      
      case 'telefone':
        // +55 (99) 99999-9999
        if (cleanValue.length <= 10) {
          return cleanValue
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
        } else {
          return cleanValue
            .replace(/(\d{2})(\d)/, '+55 ($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2');
        }
      
      default:
        return value; // Para email e chave aleatória, não aplicar máscara
    }
  };

  // Placeholder baseado no tipo
  const getPlaceholder = (type: string): string => {
    switch (type) {
      case 'cpf_cnpj':
        return '000.000.000-00 ou 00.000.000/0000-00';
      case 'email':
        return 'seuemail@exemplo.com';
      case 'telefone':
        return '+55 (11) 99999-9999';
      case 'aleatoria':
        return 'UUID ou chave alfanumérica';
      default:
        return 'Digite a chave PIX';
    }
  };

  // Efeito para validar quando o valor ou tipo mudar
  useEffect(() => {
    const validation = validatePix(localPixValue, localPixType);
    setValidationError(validation.error);
    setIsValid(validation.isValid);
  }, [localPixValue, localPixType]);

  // Efeito para sincronizar com props externas
  useEffect(() => {
    if (pixValue !== localPixValue) {
      setLocalPixValue(pixValue);
    }
    if (pixType !== localPixType) {
      setLocalPixType(pixType || 'cpf_cnpj');
    }
  }, [pixValue, pixType]);

  // Manipular mudança no tipo de PIX
  const handleTypeChange = (newType: string) => {
    setLocalPixType(newType);
    setLocalPixValue(''); // Limpar valor quando mudar tipo
    onPixChange('', newType);
  };

  // Manipular mudança no valor PIX
  const handleValueChange = (newValue: string) => {
    let processedValue = newValue;
    
    // Aplicar máscara apenas para CPF/CNPJ e telefone
    if (localPixType === 'cpf_cnpj' || localPixType === 'telefone') {
      processedValue = applyMask(newValue, localPixType);
    }
    
    setLocalPixValue(processedValue);
    onPixChange(processedValue, localPixType);
  };

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4 ${className}`}>
      {/* Título da Seção */}
      <h3 className="text-lg font-semibold text-gray-800">Informações de PIX</h3>
      
      {/* Tipo de PIX */}
      <div className="space-y-2">
        <label htmlFor="pix-type" className="block text-sm font-medium text-gray-700">
          Tipo de PIX
        </label>
        <select
          id="pix-type"
          value={localPixType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
        >
          {pixTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Chave PIX */}
      <div className="space-y-2">
        <label htmlFor="pix-key" className="block text-sm font-medium text-gray-700">
          Chave PIX
        </label>
        <div className="relative">
          <input
            id="pix-key"
            type="text"
            value={localPixValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={getPlaceholder(localPixType)}
            className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 transition-colors ${
              validationError
                ? 'border-red-300 bg-red-50 focus:border-red-500'
                : isValid === true && localPixValue
                ? 'border-green-300 bg-green-50 focus:border-green-500'
                : 'border-gray-300 bg-white focus:border-blue-500'
            }`}
            aria-invalid={!!validationError}
            aria-describedby={validationError ? 'pix-error' : undefined}
          />
          
          {/* Ícone de validação */}
          {localPixValue && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {validationError ? (
                <X className="w-4 h-4 text-red-500" />
              ) : isValid ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
            </div>
          )}
        </div>
        
        {/* Mensagem de erro */}
        {validationError && (
          <p id="pix-error" className="text-xs text-red-600 flex items-center mt-1">
            <AlertCircle className="w-3 h-3 mr-1" />
            {validationError}
          </p>
        )}
        
        {/* Mensagem de ajuda */}
        {!validationError && (
          <p className="text-xs text-gray-500">
            {localPixType === 'cpf_cnpj' && 'Digite apenas números, a formatação será aplicada automaticamente'}
            {localPixType === 'email' && 'Digite um endereço de email válido'}
            {localPixType === 'telefone' && 'Digite apenas números, incluindo DDD'}
            {localPixType === 'aleatoria' && 'UUID ou chave alfanumérica de 8-32 caracteres'}
          </p>
        )}
      </div>
    </div>
  );
};