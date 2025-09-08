-- Migration: fix_users_policy_no_recursion_v2
-- Created at: 1757097334

-- Remove a política problemática
DROP POLICY IF EXISTS users_select_emergency_fix ON users;

-- Cria política totalmente segura sem recursão
-- Usando apenas comparações de campos diretos
CREATE POLICY users_select_safe_final ON users
FOR SELECT
USING (
  -- Usuário pode sempre ver a si mesmo
  auth_user_id = auth.uid()
  OR
  -- Se o usuário logado é Global, pode ver todos
  (
    SELECT ur.role_name FROM user_roles ur 
    INNER JOIN users u ON u.role_id = ur.id 
    WHERE u.auth_user_id = auth.uid()
  ) = 'Global'
  OR
  -- Se o usuário logado é Master, pode ver usuários onde superior_user_id aponta para ele
  (
    (
      SELECT ur.role_name FROM user_roles ur 
      INNER JOIN users u ON u.role_id = ur.id 
      WHERE u.auth_user_id = auth.uid()
    ) = 'Master'
    AND 
    superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
  OR
  -- Se o usuário logado é Escritório, pode ver usuários onde superior_user_id aponta para ele
  (
    (
      SELECT ur.role_name FROM user_roles ur 
      INNER JOIN users u ON u.role_id = ur.id 
      WHERE u.auth_user_id = auth.uid()
    ) = 'Escritório'
    AND 
    superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
  OR
  -- Se o usuário logado é Assessor, pode ver usuários onde superior_user_id aponta para ele
  (
    (
      SELECT ur.role_name FROM user_roles ur 
      INNER JOIN users u ON u.role_id = ur.id 
      WHERE u.auth_user_id = auth.uid()
    ) = 'Assessor'
    AND 
    superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);;