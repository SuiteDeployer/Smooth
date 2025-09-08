-- Migration: fix_recursive_policy
-- Created at: 1753649968

-- Remover todas as políticas problemáticas da tabela users
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_subordinates" ON users;
DROP POLICY IF EXISTS "users_insert_by_superior" ON users;

-- Criar políticas simples e não recursivas
-- 1. Usuários podem ver seus próprios dados
CREATE POLICY "users_own_data" ON users 
FOR ALL 
USING (auth_user_id = auth.uid());

-- Temporariamente, permitir que usuários autenticados vejam outros usuários
-- (isso será refinado depois que o login estiver funcionando)
CREATE POLICY "users_authenticated_read" ON users 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Permitir inserção de novos usuários para usuários autenticados
CREATE POLICY "users_authenticated_insert" ON users 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);;