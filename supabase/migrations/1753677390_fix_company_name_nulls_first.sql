-- Migration: fix_company_name_nulls_first
-- Created at: 1753677390

-- Migration: fix_company_name_nulls_first
-- Corrigir valores nulos antes de aplicar constraint

-- Primeiro, vamos atualizar todos os valores nulos
UPDATE users 
SET company_name = CASE 
    WHEN user_type = 'investor' THEN 'N/A - Investidor'
    ELSE 'Empresa não informada'
END
WHERE company_name IS NULL;

-- Verificar se ainda existem valores nulos
SELECT COUNT(*) as null_count FROM users WHERE company_name IS NULL;;