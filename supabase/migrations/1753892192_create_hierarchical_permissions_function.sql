-- Migration: create_hierarchical_permissions_function
-- Created at: 1753892192

-- Função recursiva para obter todos os descendentes de um usuário na hierarquia
CREATE OR REPLACE FUNCTION get_user_descendants(input_user_id UUID)
RETURNS TABLE(user_id UUID, role TEXT, company_name TEXT, superior_user_id UUID, level_depth INTEGER)
LANGUAGE SQL
STABLE
AS $$
  WITH RECURSIVE user_hierarchy AS (
    -- Caso base: o próprio usuário
    SELECT 
      u.id as user_id,
      u.role,
      u.company_name,
      u.superior_user_id,
      0 as level_depth
    FROM users u
    WHERE u.id = input_user_id
    
    UNION ALL
    
    -- Caso recursivo: todos os subordinados diretos e indiretos
    SELECT 
      u.id as user_id,
      u.role,
      u.company_name,
      u.superior_user_id,
      uh.level_depth + 1 as level_depth
    FROM users u
    INNER JOIN user_hierarchy uh ON u.superior_user_id = uh.user_id
    WHERE u.superior_user_id IS NOT NULL
  )
  SELECT * FROM user_hierarchy;
$$;

-- Função para verificar se um usuário pode gerenciar outro usuário
CREATE OR REPLACE FUNCTION can_user_manage_target(manager_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM get_user_descendants(manager_user_id) 
    WHERE user_id = target_user_id
  );
$$;

-- Função para obter usuários que um determinado usuário pode visualizar/gerenciar
CREATE OR REPLACE FUNCTION get_manageable_users(manager_user_id UUID)
RETURNS TABLE(user_id UUID, role TEXT, company_name TEXT, superior_user_id UUID, level_depth INTEGER)
LANGUAGE SQL
STABLE
AS $$
  -- Primeiro, verificamos o role do usuário gerenciador
  WITH manager_info AS (
    SELECT role FROM users WHERE id = manager_user_id
  )
  SELECT 
    CASE 
      -- Global pode ver todos os usuários
      WHEN (SELECT role FROM manager_info) = 'Global' THEN (
        SELECT u.id, u.role, u.company_name, u.superior_user_id, 0 as level_depth
        FROM users u
      )
      -- Para outros roles, retorna apenas os descendentes
      ELSE (
        SELECT h.user_id, h.role, h.company_name, h.superior_user_id, h.level_depth
        FROM get_user_descendants(manager_user_id) h
      )
    END;
$$;;