-- Migration: fix_investments_rls_hierarchical_policy
-- Created at: 1757021107

-- CORREÇÃO: Políticas RLS para tabela INVESTMENTS
-- Baseado no modelo correto da tabela remuneracoes

-- 1. Remover políticas problemáticas existentes
DROP POLICY IF EXISTS "investments_select_all" ON investments;
DROP POLICY IF EXISTS "investments_insert_all" ON investments;
DROP POLICY IF EXISTS "investments_update_all" ON investments;
DROP POLICY IF EXISTS "investments_delete_all" ON investments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON investments;

-- 2. Criar políticas hierárquicas para INVESTMENTS
-- Política SELECT: Usuário vê investimentos de sua rede hierárquica
CREATE POLICY "investments_select_hierarchical" ON investments
FOR SELECT USING (
    -- Global vê tudo
    (EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    ))
    OR
    -- Investimentos onde o usuário é o próprio investidor
    (investor_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    ))
    OR
    -- Investimentos onde o usuário é o próprio assessor
    (assessor_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    ))
    OR
    -- Investimentos de usuários na hierarquia subordinada (via investor_user_id)
    (investor_user_id IN (
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
    OR
    -- Investimentos de usuários na hierarquia subordinada (via assessor_user_id)
    (assessor_user_id IN (
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

-- Política INSERT: Apenas usuários autenticados (Global/Master podem criar)
CREATE POLICY "investments_insert_hierarchical" ON investments
FOR INSERT WITH CHECK (
    (EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name IN ('Global', 'Master', 'Escritório', 'Assessor')
    ))
);

-- Política UPDATE: Apenas Global ou usuários da hierarquia
CREATE POLICY "investments_update_hierarchical" ON investments
FOR UPDATE USING (
    -- Global pode atualizar tudo
    (EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    ))
    OR
    -- Usuários podem atualizar investimentos de sua hierarquia subordinada
    (investor_user_id IN (
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
    OR
    (assessor_user_id IN (
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
CREATE POLICY "investments_delete_hierarchical" ON investments
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
);;