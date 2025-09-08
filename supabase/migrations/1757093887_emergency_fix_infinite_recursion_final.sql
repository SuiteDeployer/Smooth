-- Migration: emergency_fix_infinite_recursion_final
-- Created at: 1757093887

-- EMERGENCY FIX: Remover todas as políticas RLS problemáticas e criar políticas simples

-- 1. Remover todas as políticas problemáticas da tabela remuneracoes
DROP POLICY IF EXISTS remuneracoes_select_policy ON remuneracoes;
DROP POLICY IF EXISTS remuneracoes_update_policy ON remuneracoes;
DROP POLICY IF EXISTS remuneracoes_insert_policy ON remuneracoes;
DROP POLICY IF EXISTS remuneracoes_delete_policy ON remuneracoes;

-- 2. Remover políticas conflitantes da tabela users
DROP POLICY IF EXISTS users_select_hierarchical_safe ON users;
DROP POLICY IF EXISTS allow_authenticated_users_full_access ON users;

-- 3. Criar políticas SIMPLES para remuneracoes (SEM RECURSÃO)
CREATE POLICY remuneracoes_select_simple ON remuneracoes FOR SELECT 
USING (
  -- Global vê tudo
  EXISTS (
    SELECT 1 FROM users u 
    JOIN user_roles ur ON u.role_id = ur.id 
    WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
  )
  OR
  -- Usuário vê suas próprias remunerações
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR
  -- Master/Escritório/Assessor vê remunerações de subordinados diretos apenas
  user_id IN (
    SELECT id FROM users 
    WHERE superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY remuneracoes_insert_simple ON remuneracoes FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN user_roles ur ON u.role_id = ur.id 
    WHERE u.auth_user_id = auth.uid() 
    AND ur.role_name IN ('Global', 'Master')
  )
);

CREATE POLICY remuneracoes_update_simple ON remuneracoes FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN user_roles ur ON u.role_id = ur.id 
    WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
  )
);

CREATE POLICY remuneracoes_delete_simple ON remuneracoes FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN user_roles ur ON u.role_id = ur.id 
    WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
  )
);

-- 4. Criar política SIMPLES para users (SEM RECURSÃO)
CREATE POLICY users_select_simple ON users FOR SELECT 
USING (
  -- Global vê todos
  EXISTS (
    SELECT 1 FROM users u 
    JOIN user_roles ur ON u.role_id = ur.id 
    WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
  )
  OR
  -- Usuário vê a si mesmo
  auth_user_id = auth.uid()
  OR
  -- Usuário vê subordinados diretos apenas (sem recursão)
  superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);;