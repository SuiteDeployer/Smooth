-- Migration: remove_recursive_policy_emergency_fix
-- Created at: 1757097317

-- CORREÇÃO DE EMERGÊNCIA: Remove a política recursiva
DROP POLICY IF EXISTS users_select_working ON users;

-- Cria uma política super simples SEM recursão 
-- Usando apenas JOINs diretos e sem subqueries na tabela users
CREATE POLICY users_select_emergency_fix ON users
FOR SELECT
USING (
  -- Usuário pode ver a si mesmo (sem subquery)
  auth_user_id = auth.uid()
  OR
  -- Global pode ver todos (usando EXISTS apenas com user_roles)
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.id = role_id AND ur.role_name = 'Global'
  )
  OR
  -- Para Master: pode ver usuários com superior_user_id igual ao ID do Master
  (
    role_id IN (SELECT id FROM user_roles WHERE role_name = 'Master')
    AND superior_user_id IS NOT NULL
  )
);;