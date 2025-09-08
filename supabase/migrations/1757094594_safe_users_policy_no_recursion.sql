-- Migration: safe_users_policy_no_recursion
-- Created at: 1757094594

-- CORREÇÃO SEGURA: Política sem recursão mas com segurança

-- 1. Remover a política temporária
DROP POLICY IF EXISTS users_select_no_recursion ON users;

-- 2. Criar política segura sem recursão na tabela users
-- A chave é não fazer subconsultas na própria tabela users
CREATE POLICY users_select_safe ON users FOR SELECT 
USING (
  -- Usuário vê apenas seu próprio registro
  auth_user_id = auth.uid()
);

-- Para funcionalidade hierárquica, vamos usar views ou edge functions
-- que não dependam de RLS na tabela users

-- 3. Verificar política criada
SELECT 'Política segura criada: users_select_safe' as status;;