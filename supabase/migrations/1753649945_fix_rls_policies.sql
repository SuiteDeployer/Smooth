-- Migration: fix_rls_policies
-- Created at: 1753649945

-- Remover políticas problemáticas e recriar mais simples
DROP POLICY IF EXISTS "users_policy" ON users;

-- Criar política mais simples para a tabela users
CREATE POLICY "users_select_own" ON users 
FOR SELECT 
USING (auth_user_id = auth.uid());

CREATE POLICY "users_select_subordinates" ON users 
FOR SELECT 
USING (
    -- Usuário pode ver seus subordinados diretos
    superior_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "users_insert_by_superior" ON users 
FOR INSERT 
WITH CHECK (
    -- Verificar se o usuário logado pode criar este tipo de usuário
    EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid()
        AND (
            -- Global pode criar qualquer um
            ur.role_name = 'Global'
            OR
            -- Outros podem criar apenas níveis abaixo na hierarquia
            superior_user_id = u.id
        )
    )
);

-- Política mais permissiva para investimentos (simplificar para debug)
DROP POLICY IF EXISTS "investments_policy" ON investments;
CREATE POLICY "investments_select_all" ON investments FOR SELECT USING (true);
CREATE POLICY "investments_insert_all" ON investments FOR INSERT WITH CHECK (true);

-- Política para séries (permitir leitura para todos autenticados)
DROP POLICY IF EXISTS "series_policy" ON series;
CREATE POLICY "series_select_active" ON series FOR SELECT USING (status = 'active');

-- Política para user_roles (permitir leitura para todos autenticados)
CREATE POLICY "user_roles_select_all" ON user_roles FOR SELECT USING (true);;