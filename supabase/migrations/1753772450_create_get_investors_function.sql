-- Migration: create_get_investors_function
-- Created at: 1753772450

-- Criar função para buscar investidores diretamente
CREATE OR REPLACE FUNCTION get_investors_raw()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  status TEXT,
  user_type TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT u.id, u.email, u.full_name, u.status, u.user_type
  FROM users u
  INNER JOIN user_roles ur ON u.role_id = ur.id
  WHERE ur.role_name = 'Investidor' 
    AND u.status = 'active'
  ORDER BY u.full_name;
$$;;