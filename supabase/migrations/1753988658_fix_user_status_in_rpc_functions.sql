-- Migration: fix_user_status_in_rpc_functions
-- Created at: 1753988658

-- Corrigir função get_all_users_for_global para incluir status
CREATE OR REPLACE FUNCTION get_all_users_for_global()
RETURNS TABLE (
  user_id uuid,
  role_name text,
  hierarchy_level integer,
  company_name text,
  superior_user_id uuid,
  level_depth integer,
  email text,
  full_name text,
  status text,
  cpf_cnpj text,
  phone text,
  pix text,
  pix_key_type text,
  created_at timestamp with time zone
)
LANGUAGE sql
AS $$
  SELECT 
    u.id as user_id,
    ur.role_name,
    ur.hierarchy_level,
    u.company_name,
    u.superior_user_id,
    0 as level_depth,  -- Para Global, todos estão no mesmo nível conceitual
    u.email,
    u.full_name,
    u.status,
    u.cpf_cnpj,
    u.phone,
    u.pix,
    u.pix_key_type,
    u.created_at
  FROM users u
  LEFT JOIN user_roles ur ON u.role_id = ur.id
  ORDER BY ur.hierarchy_level, u.full_name;
$$;

-- Corrigir função get_user_descendants para incluir status
CREATE OR REPLACE FUNCTION get_user_descendants(input_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  role_name text,
  hierarchy_level integer,
  company_name text,
  superior_user_id uuid,
  level_depth integer,
  email text,
  full_name text,
  status text,
  cpf_cnpj text,
  phone text,
  pix text,
  pix_key_type text,
  created_at timestamp with time zone
)
LANGUAGE sql
AS $$
  WITH RECURSIVE user_hierarchy AS (
    -- Caso base: o próprio usuário
    SELECT 
      u.id as user_id,
      ur.role_name,
      ur.hierarchy_level,
      u.company_name,
      u.superior_user_id,
      0 as level_depth,
      u.email,
      u.full_name,
      u.status,
      u.cpf_cnpj,
      u.phone,
      u.pix,
      u.pix_key_type,
      u.created_at
    FROM users u
    LEFT JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = input_user_id
    
    UNION ALL
    
    -- Caso recursivo: todos os subordinados diretos e indiretos
    SELECT 
      u.id as user_id,
      ur.role_name,
      ur.hierarchy_level,
      u.company_name,
      u.superior_user_id,
      uh.level_depth + 1 as level_depth,
      u.email,
      u.full_name,
      u.status,
      u.cpf_cnpj,
      u.phone,
      u.pix,
      u.pix_key_type,
      u.created_at
    FROM users u
    LEFT JOIN user_roles ur ON u.role_id = ur.id
    INNER JOIN user_hierarchy uh ON u.superior_user_id = uh.user_id
    WHERE u.superior_user_id IS NOT NULL
  )
  SELECT * FROM user_hierarchy;
$$;;