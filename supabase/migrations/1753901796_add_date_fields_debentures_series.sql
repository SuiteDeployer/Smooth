-- Migration: add_date_fields_debentures_series
-- Created at: 1753901796

-- Adicionar campo maturity_date na tabela debentures
ALTER TABLE debentures 
ADD COLUMN maturity_date DATE;

-- Adicionar campos emission_date e maturity_date na tabela series
ALTER TABLE series 
ADD COLUMN emission_date DATE,
ADD COLUMN maturity_date DATE;;