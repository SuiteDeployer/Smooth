-- Migration: migrate_data_maturity_period_to_duration_months
-- Created at: 1753909547

-- Migrar dados de maturity_period_months para duration_months
UPDATE series 
SET duration_months = maturity_period_months 
WHERE duration_months IS NULL AND maturity_period_months IS NOT NULL;

-- Remover a coluna antiga
ALTER TABLE series DROP COLUMN IF EXISTS maturity_period_months;;