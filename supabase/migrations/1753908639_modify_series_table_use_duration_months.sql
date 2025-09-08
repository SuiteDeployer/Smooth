-- Migration: modify_series_table_use_duration_months
-- Created at: 1753908639

-- Remover colunas de data da tabela series
ALTER TABLE series DROP COLUMN IF EXISTS issue_date;
ALTER TABLE series DROP COLUMN IF EXISTS maturity_date;

-- Adicionar coluna de prazo em meses
ALTER TABLE series ADD COLUMN duration_months INTEGER;;