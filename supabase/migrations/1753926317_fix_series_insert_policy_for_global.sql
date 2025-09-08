-- Migration: fix_series_insert_policy_for_global
-- Created at: 1753926317

-- Remover política antiga de INSERT
DROP POLICY IF EXISTS series_insert_authenticated ON series;

-- Criar nova política de INSERT que permite Global criar séries
CREATE POLICY series_insert_global_and_authenticated ON series
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- Permitir para usuários Global
    EXISTS (
      SELECT 1 
      FROM users u 
      JOIN user_roles ur ON u.role_id = ur.id 
      WHERE u.auth_user_id = auth.uid() 
      AND ur.role_name = 'Global'
    ) OR
    -- Permitir para usuários autenticados em geral (temporário para debug)
    auth.uid() IS NOT NULL
  )
);;