import { useState, useEffect } from 'react';

interface PixValidationResult {
  isValid: boolean;
  error: string;
  type: string;
}

export const usePixValidation = () => {
  // Função para detectar automaticamente o tipo de PIX
  const detectPixType = (pixKey: string): string => {
    if (!pixKey || pixKey.length === 0) {
      return 'cpf_cnpj';
    }
    
    // Remover caracteres especiais para análise
    const cleanKey = pixKey.replace(/\D/g, '');
    
    // CPF (11 dígitos)
    if (cleanKey.length === 11) {
      return 'cpf_cnpj';
    }
    
    // CNPJ (14 dígitos)
    if (cleanKey.length === 14) {
      return 'cpf_cnpj';
    }
    
    // Email
    if (pixKey.includes('@') && pixKey.includes('.')) {
      return 'email';
    }
    
    // Telefone (formato brasileiro)
    if (cleanKey.length >= 10 && cleanKey.length <= 13) {
      return 'telefone';
    }
    
    // Chave aleatória (UUID)
    if (pixKey.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
      return 'aleatoria';
    }
    
    // Se não conseguir detectar, assumir CPF/CNPJ
    return 'cpf_cnpj';
  };

  // Função para validar PIX
  const validatePix = (pixKey: string, pixType: string): PixValidationResult => {
    if (!pixKey || pixKey.trim().length === 0) {
      return {
        isValid: true,
        error: '',
        type: pixType
      };
    }

    switch (pixType) {
      case 'cpf_cnpj':
        return validateCpfCnpj(pixKey);
      case 'email':
        return validateEmail(pixKey);
      case 'telefone':
        return validatePhone(pixKey);
      case 'aleatoria':
        return validateRandomKey(pixKey);
      default:
        return {
          isValid: false,
          error: 'Tipo de PIX inválido',
          type: pixType
        };
    }
  };

  // Validar CPF/CNPJ
  const validateCpfCnpj = (value: string): PixValidationResult => {
    const cleanValue = value.replace(/\D/g, '');
    
    if (cleanValue.length === 11) {
      // Validação básica de CPF
      if (!/^\d{11}$/.test(cleanValue)) {
        return {
          isValid: false,
          error: 'CPF deve conter 11 dígitos',
          type: 'cpf_cnpj'
        };
      }
      
      // Verificar se não são todos os dígitos iguais
      if (/^(\d)\1{10}$/.test(cleanValue)) {
        return {
          isValid: false,
          error: 'CPF inválido',
          type: 'cpf_cnpj'
        };
      }
      
      return {
        isValid: true,
        error: '',
        type: 'cpf_cnpj'
      };
    } else if (cleanValue.length === 14) {
      // Validação básica de CNPJ
      if (!/^\d{14}$/.test(cleanValue)) {
        return {
          isValid: false,
          error: 'CNPJ deve conter 14 dígitos',
          type: 'cpf_cnpj'
        };
      }
      
      return {
        isValid: true,
        error: '',
        type: 'cpf_cnpj'
      };
    } else {
      return {
        isValid: false,
        error: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos',
        type: 'cpf_cnpj'
      };
    }
  };

  // Validar email
  const validateEmail = (value: string): PixValidationResult => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    
    if (emailRegex.test(value)) {
      return {
        isValid: true,
        error: '',
        type: 'email'
      };
    } else {
      return {
        isValid: false,
        error: 'Formato de email inválido',
        type: 'email'
      };
    }
  };

  // Validar telefone
  const validatePhone = (value: string): PixValidationResult => {
    const cleanValue = value.replace(/\D/g, '');
    
    if (cleanValue.length >= 10 && cleanValue.length <= 13) {
      return {
        isValid: true,
        error: '',
        type: 'telefone'
      };
    } else {
      return {
        isValid: false,
        error: 'Telefone deve ter entre 10 e 13 dígitos (DDD + número)',
        type: 'telefone'
      };
    }
  };

  // Validar chave aleatória
  const validateRandomKey = (value: string): PixValidationResult => {
    // UUID
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    // String alfanumérica
    const alphaNumRegex = /^[a-zA-Z0-9]{8,32}$/;
    
    if (uuidRegex.test(value) || alphaNumRegex.test(value)) {
      return {
        isValid: true,
        error: '',
        type: 'aleatoria'
      };
    } else {
      return {
        isValid: false,
        error: 'Chave deve ser um UUID ou string alfanumérica de 8-32 caracteres',
        type: 'aleatoria'
      };
    }
  };

  return {
    validatePix,
    detectPixType
  };
};