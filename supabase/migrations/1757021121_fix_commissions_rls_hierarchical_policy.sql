-- Migration: fix_commissions_rls_hierarchical_policy
-- Created at: 1757021121

-- CORREÇÃO: Políticas RLS para tabela COMMISSIONS
-- Baseado no modelo correto da tabela remuneracoes

-- 1. Remover políticas problemáticas existentes
DROP POLICY IF EXISTS "commissions_read_all" ON commissions;
DROP POLICY IF EXISTS "commissions_insert_authenticated_fixed" ON commissions;

-- 2. Criar políticas hierárquicas para COMMISSIONS
-- Política SELECT: Usuário vê comissões de sua rede hierárquica
CREATE POLICY "commissions_select_hierarchical" ON commissions
FOR SELECT USING (
    -- Global vê tudo
    (EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    ))
    OR
    -- Comissões onde o usuário é o próprio recipient
    (recipient_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    ))
    OR
    -- Comissões de usuários na hierarquia subordinada
    (recipient_user_id IN (
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
);

-- Política INSERT: Usuários autenticados com privilégios adequados
CREATE POLICY "commissions_insert_hierarchical" ON commissions
FOR INSERT WITH CHECK (
    (EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name IN ('Global', 'Master', 'Escritório')
    ))
);

-- Política UPDATE: Apenas Global ou usuários da hierarquia
CREATE POLICY "commissions_update_hierarchical" ON commissions
FOR UPDATE USING (
    -- Global pode atualizar tudo
    (EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    ))
    OR
    -- Usuários podem atualizar comissões de sua hierarquia subordinada
    (recipient_user_id IN (
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
        UNION
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    ))
);

-- Política DELETE: Apenas Global
CREATE POLICY "commissions_delete_hierarchical" ON commissions
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
);;