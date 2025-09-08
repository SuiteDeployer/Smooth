-- Migration: create_hierarchical_permissions_functions_fixed
-- Created at: 1753892265

-- Função recursiva para obter todos os descendentes de um usuário na hierarquia
CREATE OR REPLACE FUNCTION get_user_descendants(input_user_id UUID)
RETURNS TABLE(
  user_id UUID, 
  role_name TEXT, 
  hierarchy_level INTEGER,
  company_name TEXT, 
  superior_user_id UUID, 
  level_depth INTEGER,
  email TEXT,
  full_name TEXT
)
LANGUAGE SQL
STABLE
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
      u.full_name
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
      u.full_name
    FROM users u
    LEFT JOIN user_roles ur ON u.role_id = ur.id
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
  WITH manager_role AS (
    SELECT ur.role_name
    FROM users u
    LEFT JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = manager_user_id
  )
  SELECT 
    CASE 
      -- Global pode gerenciar qualquer usuário
      WHEN (SELECT role_name FROM manager_role) = 'Global' THEN true
      -- Investidor só pode ver a si mesmo
      WHEN (SELECT role_name FROM manager_role) = 'Investidor' AND manager_user_id = target_user_id THEN true
      WHEN (SELECT role_name FROM manager_role) = 'Investidor' AND manager_user_id != target_user_id THEN false
      -- Para outros roles, verifica se o target está na hierarquia do manager
      ELSE EXISTS (
        SELECT 1 
        FROM get_user_descendants(manager_user_id) 
        WHERE user_id = target_user_id AND level_depth > 0
      )
    END;
$$;

-- Função para obter todos os usuários que um determinado usuário pode visualizar
CREATE OR REPLACE FUNCTION get_visible_users_for_manager(manager_user_id UUID)
RETURNS TABLE(
  user_id UUID, 
  role_name TEXT, 
  hierarchy_level INTEGER,
  company_name TEXT, 
  superior_user_id UUID, 
  level_depth INTEGER,
  email TEXT,
  full_name TEXT
)
LANGUAGE SQL
STABLE
AS $$
  WITH manager_info AS (
    SELECT ur.role_name, ur.hierarchy_level
    FROM users u
    LEFT JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = manager_user_id
  )
  SELECT 
    h.user_id,
    h.role_name,
    h.hierarchy_level,
    h.company_name,
    h.superior_user_id,
    h.level_depth,
    h.email,
    h.full_name
  FROM get_user_descendants(manager_user_id) h
  WHERE 
    CASE 
      -- Global pode ver todos os usuários
      WHEN (SELECT role_name FROM manager_info) = 'Global' THEN true
      -- Investidor só pode ver a si mesmo
      WHEN (SELECT role_name FROM manager_info) = 'Investidor' AND h.user_id = manager_user_id THEN true
      WHEN (SELECT role_name FROM manager_info) = 'Investidor' AND h.user_id != manager_user_id THEN false
      -- Outros podem ver a si mesmos e subordinados
      ELSE true
    END;
$$;

-- Para Global: função especial que retorna TODOS os usuários
CREATE OR REPLACE FUNCTION get_all_users_for_global()
RETURNS TABLE(
  user_id UUID, 
  role_name TEXT, 
  hierarchy_level INTEGER,
  company_name TEXT, 
  superior_user_id UUID, 
  level_depth INTEGER,
  email TEXT,
  full_name TEXT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    u.id as user_id,
    ur.role_name,
    ur.hierarchy_level,
    u.company_name,
    u.superior_user_id,
    0 as level_depth,  -- Para Global, todos estão no mesmo nível conceitual
    u.email,
    u.full_name
  FROM users u
  LEFT JOIN user_roles ur ON u.role_id = ur.id
  ORDER BY ur.hierarchy_level, u.full_name;
$$;;