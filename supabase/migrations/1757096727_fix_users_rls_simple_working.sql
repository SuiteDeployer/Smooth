-- Migration: fix_users_rls_simple_working
-- Created at: 1757096727

-- Remove a política problemática
DROP POLICY IF EXISTS users_select_hierarchical ON users;

-- Cria política simples e funcional
CREATE POLICY users_select_working ON users
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
  -- Master pode ver todos usuários que têm ele como superior (direto ou indireto)
  (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.role_id = ur.id
      WHERE u.auth_user_id = auth.uid()
      AND ur.role_name = 'Master'
    )
    AND (
      superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      OR
      id IN (
        SELECT u2.id FROM users u2
        WHERE u2.superior_user_id IN (
          SELECT u3.id FROM users u3
          WHERE u3.superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
      )
      OR
      id IN (
        SELECT u4.id FROM users u4
        WHERE u4.superior_user_id IN (
          SELECT u5.id FROM users u5
          WHERE u5.superior_user_id IN (
            SELECT u6.id FROM users u6
            WHERE u6.superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
          )
        )
      )
    )
  )
  OR
  -- Escritório pode ver subordinados diretos e indiretos
  (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.role_id = ur.id
      WHERE u.auth_user_id = auth.uid()
      AND ur.role_name = 'Escritório'
    )
    AND (
      superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      OR
      id IN (
        SELECT u2.id FROM users u2
        WHERE u2.superior_user_id IN (
          SELECT u3.id FROM users u3
          WHERE u3.superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
      )
    )
  )
  OR
  -- Assessor pode ver subordinados diretos
  (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.role_id = ur.id
      WHERE u.auth_user_id = auth.uid()
      AND ur.role_name = 'Assessor'
    )
    AND superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);;