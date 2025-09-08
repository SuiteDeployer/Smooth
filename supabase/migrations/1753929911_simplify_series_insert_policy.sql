-- Migration: simplify_series_insert_policy
-- Created at: 1753929911

-- Remover a política de INSERT atual
DROP POLICY IF EXISTS series_insert_global_and_authenticated ON series;

-- Criar uma política mais simples que só permite Global
CREATE POLICY series_insert_global_only ON series
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM users u 
    JOIN user_roles ur ON u.role_id = ur.id 
    WHERE u.auth_user_id = auth.uid() 
    AND ur.role_name = 'Global'
  )
);;