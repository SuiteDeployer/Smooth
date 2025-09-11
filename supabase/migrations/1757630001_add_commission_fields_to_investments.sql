-- Adicionar campos de comissão à tabela investments
-- Seguindo MANUS_RULES: distribuição definida no momento da criação do investimento

ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS commission_master DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_escritorio DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_assessor DECIMAL(5,2) DEFAULT 0.00;

-- Comentários para documentar os campos
COMMENT ON COLUMN investments.commission_master IS 'Percentual de comissão para Master (ex: 8.00 para 8%)';
COMMENT ON COLUMN investments.commission_escritorio IS 'Percentual de comissão para Escritório (ex: 2.00 para 2%)';
COMMENT ON COLUMN investments.commission_assessor IS 'Percentual de comissão para Assessor (ex: 2.00 para 2%)';

-- Criar constraint para garantir que a soma não exceda a comissão máxima da série
-- Nota: Esta constraint será implementada via trigger pois precisa verificar a série

