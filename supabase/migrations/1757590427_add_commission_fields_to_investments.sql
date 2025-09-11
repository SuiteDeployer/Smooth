-- Migration: add_commission_fields_to_investments
-- Created at: 1757590427

-- Adicionar campos de comissão à tabela investments
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS commission_master DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_escritorio DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_assessor DECIMAL(5,2) DEFAULT 0.00;

-- Comentários para documentar os campos
COMMENT ON COLUMN investments.commission_master IS 'Percentual de comissão para o Master (ex: 8.00 para 8%)';
COMMENT ON COLUMN investments.commission_escritorio IS 'Percentual de comissão para o Escritório (ex: 2.00 para 2%)';
COMMENT ON COLUMN investments.commission_assessor IS 'Percentual de comissão para o Assessor (ex: 2.00 para 2%)';

