-- Migration: create_hierarchical_permissions_functions
-- Created at: 1753892240

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

-- Função para verificar se um usuário pode gerenciar outro usuário baseado nas regras de hierarquia
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
      -- Para outros roles, verifica se o target está na hierarquia do manager
      ELSE EXISTS (
        SELECT 1 
        FROM get_user_descendants(manager_user_id) 
        WHERE user_id = target_user_id AND level_depth > 0
      )
    END;
$$;

-- Função para obter usuários que um determinado usuário pode visualizar/gerenciar
CREATE OR REPLACE FUNCTION get_manageable_users(manager_user_id UUID)
RETURNS TABLE(
  user_id UUID, 
  role_name TEXT, 
  hierarchy_level INTEGER,
  company_name TEXT, 
  superior_user_id UUID, 
  level_depth INTEGER,
  email TEXT,
  full_name TEXT,
  can_edit BOOLEAN,
  can_delete BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
  WITH manager_info AS (
    SELECT ur.role_name, ur.hierarchy_level
    FROM users u
    LEFT JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = manager_user_id
  ),
  all_manageable AS (
    SELECT 
      h.*,
      CASE 
        -- Global pode editar/deletar todos
        WHEN (SELECT role_name FROM manager_info) = 'Global' THEN true
        -- Investidor só pode ver seu próprio perfil (sem editar/deletar)
        WHEN (SELECT role_name FROM manager_info) = 'Investidor' AND h.user_id = manager_user_id THEN false
        -- Outros podem editar/deletar subordinados diretos e indiretos (mas não a si mesmos)
        WHEN h.level_depth > 0 THEN true
        -- Não pode editar/deletar a si mesmo (exceto Global)
        ELSE false
      END as can_edit,
      CASE 
        -- Global pode editar/deletar todos
        WHEN (SELECT role_name FROM manager_info) = 'Global' THEN true
        -- Investidor não pode deletar ninguém
        WHEN (SELECT role_name FROM manager_info) = 'Investidor' THEN false
        -- Outros podem deletar subordinados diretos e indiretos (mas não a si mesmos)
        WHEN h.level_depth > 0 THEN true
        -- Não pode deletar a si mesmo (exceto Global)
        ELSE false
      END as can_delete
    FROM get_user_descendants(manager_user_id) h
  )
  SELECT 
    CASE 
      -- Global pode ver todos os usuários
      WHEN (SELECT role_name FROM manager_info) = 'Global' THEN (
        SELECT 
          u.id, 
          ur.role_name, 
          ur.hierarchy_level,
          u.company_name, 
          u.superior_user_id, 
          0 as level_depth,
          u.email,
          u.full_name,
          true as can_edit,
          true as can_delete
        FROM users u
        LEFT JOIN user_roles ur ON u.role_id = ur.id
      )
      -- Para Investidor, retorna apenas seu próprio perfil
      WHEN (SELECT role_name FROM manager_info) = 'Investidor' THEN (
        SELECT 
          am.user_id,
          am.role_name,
          am.hierarchy_level,
          am.company_name,
          am.superior_user_id,
          am.level_depth,
          am.email,
          am.full_name,
          false as can_edit,
          false as can_delete
        FROM all_manageable am
        WHERE am.user_id = manager_user_id
      )
      -- Para outros roles, retorna descendentes + eles mesmos
      ELSE (
        SELECT 
          am.user_id,
          am.role_name,
          am.hierarchy_level,
          am.company_name,
          am.superior_user_id,
          am.level_depth,
          am.email,
          am.full_name,
          am.can_edit,
          am.can_delete
        FROM all_manageable am
      )
    END;
$$;;