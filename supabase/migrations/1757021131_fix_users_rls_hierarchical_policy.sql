-- Migration: fix_users_rls_hierarchical_policy
-- Created at: 1757021131

-- CORREÇÃO: Política RLS SELECT para tabela USERS
-- Baseado no modelo correto da tabela remuneracoes
-- Mantendo as outras políticas existentes intactas

-- 1. Remover apenas a política SELECT problemática
DROP POLICY IF EXISTS "users_read_authenticated" ON users;

-- 2. Criar política SELECT hierárquica para USERS
CREATE POLICY "users_select_hierarchical" ON users
FOR SELECT USING (
    -- Global vê todos os usuários
    (EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    ))
    OR
    -- Usuário vê a si mesmo
    (auth_user_id = auth.uid())
    OR
    -- Usuário vê seus subordinados na hierarquia
    (id IN (
        WITH RECURSIVE user_hierarchy AS (
            SELECT u.id, u.superior_user_id
            FROM users u 
            JOIN users cu ON cu.auth_user_id = auth.uid()
            WHERE u.superior_user_id = cu.id
            
            UNION ALL
            
            SELECT u.id, u.superior_user_id
            FROM users u 
            JOIN user_hierarchy uh ON u.superior_user_id = uh.id
        )
        SELECT id FROM user_hierarchy
    ))
);;