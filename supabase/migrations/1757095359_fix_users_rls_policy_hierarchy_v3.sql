-- Migration: fix_users_rls_policy_hierarchy_v3
-- Created at: 1757095359

-- Remove a política restritiva atual
DROP POLICY IF EXISTS users_select_safe ON users;

-- Cria nova política que permite acesso hierárquico
CREATE POLICY users_select_hierarchical ON users
FOR SELECT
USING (
  -- Global pode ver todos
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.auth_user_id = auth.uid()
    AND ur.role_name = 'Global'
  )
  OR
  -- Usuário pode ver a si mesmo
  auth_user_id = auth.uid()
  OR
  -- Master, Escritório e Assessor podem ver usuários de sua hierarquia
  (
    EXISTS (
      SELECT 1 FROM users cu
      JOIN user_roles cr ON cu.role_id = cr.id
      WHERE cu.auth_user_id = auth.uid()
      AND cr.role_name IN ('Master', 'Escritório', 'Assessor')
    )
    AND
    -- Usando uma função recursiva para encontrar toda a hierarquia
    id IN (
      WITH RECURSIVE user_hierarchy AS (
        -- Nível base: o usuário atual
        SELECT id, superior_user_id, 0 as level
        FROM users 
        WHERE auth_user_id = auth.uid()
        
        UNION ALL
        
        -- Recursivo: encontra todos os subordinados
        SELECT u.id, u.superior_user_id, uh.level + 1
        FROM users u
        JOIN user_hierarchy uh ON u.superior_user_id = uh.id
        WHERE uh.level < 10  -- Limite de segurança para evitar recursão infinita
      )
      SELECT id FROM user_hierarchy
    )
  )
);;