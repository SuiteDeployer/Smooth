-- Migration: fix_remuneracoes_rls_policies
-- Created at: 1756754768

-- Remover políticas existentes de remuneracoes
DROP POLICY IF EXISTS remuneracoes_select_policy ON remuneracoes;
DROP POLICY IF EXISTS remuneracoes_insert_policy ON remuneracoes; 
DROP POLICY IF EXISTS remuneracoes_update_policy ON remuneracoes;
DROP POLICY IF EXISTS remuneracoes_delete_policy ON remuneracoes;

-- Criar políticas RLS mais simples e eficazes para remuneracoes
CREATE POLICY "remuneracoes_select_policy" ON remuneracoes
    FOR SELECT
    USING (
        -- Usuários Global podem ver tudo
        EXISTS (
            SELECT 1 FROM users u
            INNER JOIN user_roles ur ON u.role_id = ur.id  
            WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
        )
        OR
        -- Usuários podem ver suas próprias remunerações
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
        OR  
        -- Usuários podem ver remunerações de seus subordinados
        user_id IN (
            WITH RECURSIVE user_hierarchy AS (
                -- Ponto inicial: usuários diretos do usuário atual
                SELECT u.id, u.superior_user_id
                FROM users u 
                INNER JOIN users current_user ON current_user.auth_user_id = auth.uid()
                WHERE u.superior_user_id = current_user.id
                
                UNION ALL
                
                -- Recursão: subordinados dos subordinados  
                SELECT u.id, u.superior_user_id
                FROM users u
                INNER JOIN user_hierarchy uh ON u.superior_user_id = uh.id
            )
            SELECT id FROM user_hierarchy
        )
    );

CREATE POLICY "remuneracoes_insert_policy" ON remuneracoes
    FOR INSERT
    WITH CHECK (
        -- Apenas usuários Global e Master podem inserir
        EXISTS (
            SELECT 1 FROM users u
            INNER JOIN user_roles ur ON u.role_id = ur.id  
            WHERE u.auth_user_id = auth.uid() AND ur.role_name IN ('Global', 'Master')
        )
    );

CREATE POLICY "remuneracoes_update_policy" ON remuneracoes  
    FOR UPDATE
    USING (
        -- Usuários Global podem editar tudo
        EXISTS (
            SELECT 1 FROM users u
            INNER JOIN user_roles ur ON u.role_id = ur.id  
            WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
        )
        OR
        -- Usuários podem editar suas próprias remunerações  
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
        OR
        -- Usuários podem editar remunerações de seus subordinados
        user_id IN (
            WITH RECURSIVE user_hierarchy AS (
                SELECT u.id, u.superior_user_id
                FROM users u 
                INNER JOIN users current_user ON current_user.auth_user_id = auth.uid()
                WHERE u.superior_user_id = current_user.id
                
                UNION ALL
                
                SELECT u.id, u.superior_user_id
                FROM users u
                INNER JOIN user_hierarchy uh ON u.superior_user_id = uh.id
            )
            SELECT id FROM user_hierarchy
        )
    );

CREATE POLICY "remuneracoes_delete_policy" ON remuneracoes
    FOR DELETE
    USING (
        -- Apenas usuários Global podem deletar
        EXISTS (
            SELECT 1 FROM users u
            INNER JOIN user_roles ur ON u.role_id = ur.id  
            WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
        )
    );;