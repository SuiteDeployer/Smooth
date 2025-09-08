-- Migration: fix_commission_schedules_rls_policies
-- Created at: 1754329633

-- Corrigir políticas RLS para permitir inserção automática de comissões

-- Adicionar política de INSERT para commission_schedules
CREATE POLICY commission_schedules_insert ON commission_schedules FOR INSERT TO authenticated
WITH CHECK (true); -- Permite inserção automática pelo trigger

-- Adicionar política de INSERT para commission_payments
CREATE POLICY commission_payments_insert ON commission_payments FOR INSERT TO authenticated
WITH CHECK (true); -- Permite inserção automática pelo trigger

-- Verificar se precisamos de política para a função/trigger executar como service role
-- Criar uma política mais específica que permite inserção pelo sistema
DROP POLICY IF EXISTS commission_schedules_insert ON commission_schedules;
DROP POLICY IF EXISTS commission_payments_insert ON commission_payments;

-- Políticas que permitem inserção pelo sistema/trigger
CREATE POLICY commission_schedules_insert ON commission_schedules FOR INSERT TO authenticated
WITH CHECK (
    -- Permitir se o usuário está criando comissões para si mesmo ou seus subordinados
    recipient_user_id IN (
        WITH RECURSIVE hierarchy AS (
            -- Usuário atual
            SELECT u.id, 0 as level
            FROM users u
            WHERE u.auth_user_id = auth.uid()
            
            UNION ALL
            
            -- Subordinados diretos e indiretos
            SELECT u.id, h.level + 1
            FROM users u
            JOIN hierarchy h ON u.superior_user_id = h.id
            WHERE h.level < 10 -- Limite de profundidade
        )
        SELECT id FROM hierarchy
    )
    OR
    -- Ou se for Global/Master (pode criar para qualquer um)
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name IN ('Global', 'Master')
    )
    OR
    -- Ou permitir se for uma inserção automática do sistema (quando não há auth.uid())
    auth.uid() IS NULL
);

CREATE POLICY commission_payments_insert ON commission_payments FOR INSERT TO authenticated
WITH CHECK (
    -- Mesma lógica que commission_schedules
    EXISTS (
        SELECT 1 FROM commission_schedules cs
        WHERE cs.id = commission_schedule_id
        AND (
            cs.recipient_user_id IN (
                WITH RECURSIVE hierarchy AS (
                    SELECT u.id, 0 as level
                    FROM users u
                    WHERE u.auth_user_id = auth.uid()
                    
                    UNION ALL
                    
                    SELECT u.id, h.level + 1
                    FROM users u
                    JOIN hierarchy h ON u.superior_user_id = h.id
                    WHERE h.level < 10
                )
                SELECT id FROM hierarchy
            )
            OR
            EXISTS (
                SELECT 1 FROM users u 
                JOIN user_roles ur ON u.role_id = ur.id 
                WHERE u.auth_user_id = auth.uid() AND ur.role_name IN ('Global', 'Master')
            )
            OR
            auth.uid() IS NULL
        )
    )
);;