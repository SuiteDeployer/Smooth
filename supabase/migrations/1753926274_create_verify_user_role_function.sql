-- Migration: create_verify_user_role_function
-- Created at: 1753926274

CREATE OR REPLACE FUNCTION verify_user_role()
RETURNS TABLE (
  user_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  role_name VARCHAR,
  hierarchy_level INTEGER,
  user_type VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Retorna as informações do usuário autenticado atual
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    ur.role_name,
    ur.hierarchy_level,
    u.user_type
  FROM users u
  LEFT JOIN user_roles ur ON u.role_id = ur.id
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
END;
$$;;