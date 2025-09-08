-- Migration: fix_series_insert_policy
-- Created at: 1754926934

-- Remover política de INSERT restritiva e criar uma mais permissiva
DROP POLICY IF EXISTS series_insert_global_only ON series;

-- Criar nova política que permite INSERT para usuários autenticados
CREATE POLICY series_insert_authenticated ON series
  FOR INSERT 
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);;