-- Migration: fix_infinite_recursion_rls_policies
-- Created at: 1757092952

-- CORREÇÃO EMERGENCIAL: Simplificar políticas RLS para evitar recursão infinita

-- 1. INVESTMENTS: Simplificar políticas SELECT e UPDATE
DROP POLICY IF EXISTS "investments_select_hierarchical" ON investments;
DROP POLICY IF EXISTS "investments_update_hierarchical" ON investments;

CREATE POLICY "investments_select_simple" ON investments FOR SELECT
USING (
    -- Global vê todos
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
    OR
    -- Usuário vê investimentos onde ele é o investidor ou assessor
    investor_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    assessor_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    -- Master/Escritório veem investimentos de subordinados diretos
    (investor_user_id IN (
        SELECT id FROM users WHERE superior_user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    ))
    OR
    (assessor_user_id IN (
        SELECT id FROM users WHERE superior_user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    ))
);

CREATE POLICY "investments_update_simple" ON investments FOR UPDATE
USING (
    -- Global pode editar todos
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
    OR
    -- Usuário pode editar investimentos onde ele é assessor ou investidor
    assessor_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    investor_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- 2. COMMISSIONS: Simplificar políticas SELECT e UPDATE  
DROP POLICY IF EXISTS "commissions_select_hierarchical" ON commissions;
DROP POLICY IF EXISTS "commissions_update_hierarchical" ON commissions;

CREATE POLICY "commissions_select_simple" ON commissions FOR SELECT
USING (
    -- Global vê todas
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
    OR
    -- Usuário vê suas próprias comissões
    recipient_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    -- Master/Escritório veem comissões de subordinados diretos
    recipient_user_id IN (
        SELECT id FROM users WHERE superior_user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
);

CREATE POLICY "commissions_update_simple" ON commissions FOR UPDATE
USING (
    -- Global pode editar todas
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
    OR
    -- Master+ podem editar comissões de sua rede
    recipient_user_id IN (
        SELECT id FROM users WHERE superior_user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
);

-- 3. Manter políticas da tabela remuneracoes como estão (funcionam)
-- As políticas recursivas originais de remuneracoes não causam problema

-- 4. AUDIT_LOGS: Manter políticas restritivas simples já criadas;