-- Migration: fix_commissions_remuneracoes_rls_hierarchical
-- Created at: 1757106124

-- Migration: fix_commissions_remuneracoes_rls_hierarchical
-- Correção das políticas RLS para comissões e remuneração

-- ========================================
-- CORREÇÃO TABELA COMMISSIONS
-- ========================================

-- Remover políticas problemáticas existentes
DROP POLICY IF EXISTS "commissions_select_simple" ON commissions;
DROP POLICY IF EXISTS "commissions_update_simple" ON commissions;
DROP POLICY IF EXISTS "commissions_insert_hierarchical" ON commissions;
DROP POLICY IF EXISTS "commissions_update_hierarchical" ON commissions;
DROP POLICY IF EXISTS "commissions_delete_hierarchical" ON commissions;

-- Política SELECT corrigida com hierarquia recursiva completa
CREATE POLICY "commissions_select_hierarchical_fixed" ON commissions
FOR SELECT 
USING (
    -- Global pode ver todas as comissões
    EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid()
        AND ur.role_name = 'Global'
    )
    OR
    -- Usuário pode ver suas próprias comissões
    recipient_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    -- Usuário pode ver comissões de toda sua hierarquia subordinada (recursiva)
    recipient_user_id IN (
        WITH RECURSIVE user_hierarchy AS (
            -- Nível base: usuários diretos do usuário atual
            SELECT u.id, u.superior_user_id, 0 as level
            FROM users u 
            JOIN users cu ON cu.auth_user_id = auth.uid()
            WHERE u.superior_user_id = cu.id
            
            UNION ALL
            
            -- Recursivo: todos os subordinados dos subordinados
            SELECT u.id, u.superior_user_id, uh.level + 1
            FROM users u
            JOIN user_hierarchy uh ON u.superior_user_id = uh.id
            WHERE uh.level < 10  -- Limite de segurança para evitar recursão infinita
        )
        SELECT id FROM user_hierarchy
    )
);

-- Política INSERT: usuários com privilégios adequados podem inserir
CREATE POLICY "commissions_insert_hierarchical_fixed" ON commissions
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name IN ('Global', 'Master', 'Escritório')
    )
);

-- Política UPDATE: baseada na hierarquia
CREATE POLICY "commissions_update_hierarchical_fixed" ON commissions
FOR UPDATE 
USING (
    -- Global pode atualizar tudo
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
    OR
    -- Usuários podem atualizar comissões de sua hierarquia subordinada
    recipient_user_id IN (
        WITH RECURSIVE user_hierarchy AS (
            SELECT u.id, u.superior_user_id, 0 as level
            FROM users u 
            JOIN users cu ON cu.auth_user_id = auth.uid()
            WHERE u.superior_user_id = cu.id OR u.auth_user_id = auth.uid()
            
            UNION ALL
            
            SELECT u.id, u.superior_user_id, uh.level + 1
            FROM users u
            JOIN user_hierarchy uh ON u.superior_user_id = uh.id
            WHERE uh.level < 10
        )
        SELECT id FROM user_hierarchy
    )
);

-- Política DELETE: apenas Global
CREATE POLICY "commissions_delete_hierarchical_fixed" ON commissions
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
);

-- ========================================
-- CORREÇÃO TABELA REMUNERACOES
-- ========================================

-- Remover políticas problemáticas existentes
DROP POLICY IF EXISTS "remuneracoes_select_simple" ON remuneracoes;
DROP POLICY IF EXISTS "remuneracoes_update_simple" ON remuneracoes;
DROP POLICY IF EXISTS "remuneracoes_insert_simple" ON remuneracoes;
DROP POLICY IF EXISTS "remuneracoes_delete_simple" ON remuneracoes;

-- Política SELECT corrigida com hierarquia recursiva completa
CREATE POLICY "remuneracoes_select_hierarchical_fixed" ON remuneracoes
FOR SELECT 
USING (
    -- Global pode ver todas as remunerações
    EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid()
        AND ur.role_name = 'Global'
    )
    OR
    -- Usuário pode ver suas próprias remunerações
    user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    -- Usuário pode ver remunerações de toda sua hierarquia subordinada (recursiva)
    user_id IN (
        WITH RECURSIVE user_hierarchy AS (
            -- Nível base: usuários diretos do usuário atual
            SELECT u.id, u.superior_user_id, 0 as level
            FROM users u 
            JOIN users cu ON cu.auth_user_id = auth.uid()
            WHERE u.superior_user_id = cu.id
            
            UNION ALL
            
            -- Recursivo: todos os subordinados dos subordinados
            SELECT u.id, u.superior_user_id, uh.level + 1
            FROM users u
            JOIN user_hierarchy uh ON u.superior_user_id = uh.id
            WHERE uh.level < 10  -- Limite de segurança para evitar recursão infinita
        )
        SELECT id FROM user_hierarchy
    )
);

-- Política INSERT: usuários com privilégios adequados podem inserir
CREATE POLICY "remuneracoes_insert_hierarchical_fixed" ON remuneracoes
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name IN ('Global', 'Master', 'Escritório')
    )
);

-- Política UPDATE: baseada na hierarquia
CREATE POLICY "remuneracoes_update_hierarchical_fixed" ON remuneracoes
FOR UPDATE 
USING (
    -- Global pode atualizar tudo
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
    OR
    -- Usuários podem atualizar remunerações de sua hierarquia subordinada
    user_id IN (
        WITH RECURSIVE user_hierarchy AS (
            SELECT u.id, u.superior_user_id, 0 as level
            FROM users u 
            JOIN users cu ON cu.auth_user_id = auth.uid()
            WHERE u.superior_user_id = cu.id OR u.auth_user_id = auth.uid()
            
            UNION ALL
            
            SELECT u.id, u.superior_user_id, uh.level + 1
            FROM users u
            JOIN user_hierarchy uh ON u.superior_user_id = uh.id
            WHERE uh.level < 10
        )
        SELECT id FROM user_hierarchy
    )
);

-- Política DELETE: apenas Global
CREATE POLICY "remuneracoes_delete_hierarchical_fixed" ON remuneracoes
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
);;