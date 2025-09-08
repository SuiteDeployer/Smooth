-- Migration: fix_user_rpc_functions_filter_active_only
-- Created at: 1754273761

-- Migration: fix_user_rpc_functions_filter_active_only
-- Created at: 1753988676
-- Fix: Add status = 'active' filter to user RPC functions

-- Deletar funções existentes
DROP FUNCTION IF EXISTS get_all_users_for_global();
DROP FUNCTION IF EXISTS get_user_descendants(uuid);

-- Recriar função get_all_users_for_global com filtro de status ativo
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
  WHERE u.status = 'active'  -- CORREÇÃO: Filtrar apenas usuários ativos
  ORDER BY ur.hierarchy_level, u.full_name;
$$;

-- Recriar função get_user_descendants com filtro de status ativo
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
    -- Caso base: o próprio usuário (apenas se estiver ativo)
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
    WHERE u.id = input_user_id AND u.status = 'active'  -- CORREÇÃO: Filtrar usuário ativo
    
    UNION ALL
    
    -- Caso recursivo: todos os subordinados diretos e indiretos (apenas ativos)
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
    WHERE u.superior_user_id IS NOT NULL AND u.status = 'active'  -- CORREÇÃO: Filtrar subordinados ativos
  )
  SELECT * FROM user_hierarchy
  ORDER BY level_depth, hierarchy_level, full_name;
$$;;