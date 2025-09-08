-- Migration: add_missing_fields_debentures_series
-- Created at: 1753675716

-- Adicionar campos faltantes na tabela debentures
ALTER TABLE debentures ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE debentures ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE debentures ADD COLUMN IF NOT EXISTS max_capacity DECIMAL(15,2);

-- Adicionar campos faltantes na tabela series
ALTER TABLE series ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE series ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE series ADD COLUMN IF NOT EXISTS min_investment DECIMAL(15,2);
ALTER TABLE series ADD COLUMN IF NOT EXISTS max_investment_limit DECIMAL(15,2);

-- Atualizar dados existentes com valores padrão sensatos
UPDATE debentures SET 
  issue_date = emission_date,
  expiry_date = emission_date + INTERVAL '3 years',
  max_capacity = total_emission_value * 0.8
WHERE issue_date IS NULL;

UPDATE series SET 
  issue_date = CURRENT_DATE,
  expiry_date = CURRENT_DATE + INTERVAL '2 years',
  min_investment = minimum_investment,
  max_investment_limit = maximum_investment
WHERE issue_date IS NULL;;