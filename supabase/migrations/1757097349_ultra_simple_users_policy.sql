-- Migration: ultra_simple_users_policy
-- Created at: 1757097349

-- Remove a política atual
DROP POLICY IF EXISTS users_select_safe_final ON users;

-- Política ULTRA SIMPLES sem qualquer possibilidade de recursão
-- Apenas permite ver a si mesmo + Global vê todos
CREATE POLICY users_ultra_simple ON users
FOR SELECT
USING (
  -- Todos podem ver a si mesmos
  auth_user_id = auth.uid()
  OR
  -- Se o role_id é o ID do Global, pode ver todos
  role_id = 'c3702780-f93e-4a0d-86c2-5afe1a431fa7'::uuid
);;