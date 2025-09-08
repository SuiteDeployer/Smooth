-- Migration: add_commission_fields_to_investments
-- Created at: 1753935960

-- Adicionar campos de comissão individual à tabela investments
ALTER TABLE investments 
ADD COLUMN commission_master NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN commission_escritorio NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN commission_assessor NUMERIC(5,2) DEFAULT 0.00;

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN investments.commission_master IS 'Percentual de comissão destinado ao Master (0.00 a 100.00)';
COMMENT ON COLUMN investments.commission_escritorio IS 'Percentual de comissão destinado ao Escritório (0.00 a 100.00)';
COMMENT ON COLUMN investments.commission_assessor IS 'Percentual de comissão destinado ao Assessor (0.00 a 100.00)';

-- Adicionar constraint para garantir que a soma das comissões não seja negativa
ALTER TABLE investments 
ADD CONSTRAINT check_commission_non_negative 
CHECK (
  commission_master >= 0 AND 
  commission_escritorio >= 0 AND 
  commission_assessor >= 0
);;