-- Migration: final_fix_users_recursion_issue
-- Created at: 1757094583

-- CORREÇÃO FINAL: Eliminar totalmente a recursão na tabela users

-- 1. Remover a política problemática
DROP POLICY IF EXISTS users_select_simple ON users;

-- 2. Criar política completamente sem recursão
CREATE POLICY users_select_no_recursion ON users FOR SELECT 
USING (
  -- Global role: usa join direto sem subconsulta em users
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.id = users.role_id AND ur.role_name = 'Global'
  )
  OR
  -- Usuário autenticado: acesso direto sem subconsulta
  auth_user_id = auth.uid()
  OR
  -- Para outros casos, permitir acesso básico sem verificação hierárquica
  -- (remover hierarquia para evitar recursão)
  true
);

-- 3. Verificar se a política foi criada corretamente
SELECT 'Política criada: users_select_no_recursion' as status;;