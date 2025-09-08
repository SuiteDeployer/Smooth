-- Migration: add_pix_key_type_to_users
-- Created at: 1753981383

-- Migration: add_pix_key_type_to_users
-- Created at: 2025-08-01
-- Purpose: Adicionar campo pix_key_type para controle do tipo de chave PIX

-- 1. Adicionar campo pix_key_type à tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(20) DEFAULT 'cpf_cnpj';

-- 2. Criar constraint para validar tipos permitidos
ALTER TABLE users 
ADD CONSTRAINT users_pix_key_type_check 
CHECK (pix_key_type IN ('cpf_cnpj', 'email', 'telefone', 'aleatoria', 'outro'));

-- 3. Comentários para documentar o novo campo
COMMENT ON COLUMN users.pix_key_type IS 'Tipo da chave PIX: cpf_cnpj, email, telefone, aleatoria, outro';

-- 4. Atualizar registros existentes que tenham PIX para detectar automaticamente o tipo
UPDATE users 
SET pix_key_type = CASE 
    WHEN pix IS NULL OR LENGTH(pix) = 0 THEN 'cpf_cnpj'
    WHEN pix ~ '^\d{11}$' OR pix ~ '^\d{14}$' THEN 'cpf_cnpj'
    WHEN pix ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN 'email'
    WHEN pix ~ '^\+?55\d{10,11}$' OR pix ~ '^\d{10,11}$' THEN 'telefone'
    WHEN pix ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN 'aleatoria'
    ELSE 'outro'
END
WHERE pix IS NOT NULL;;