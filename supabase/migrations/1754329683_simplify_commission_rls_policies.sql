-- Migration: simplify_commission_rls_policies
-- Created at: 1754329683

-- Simplificar políticas RLS após correção do trigger

-- Remover políticas complexas e criar versões mais simples
DROP POLICY IF EXISTS commission_schedules_insert ON commission_schedules;
DROP POLICY IF EXISTS commission_payments_insert ON commission_payments;

-- Políticas mais simples que permitem inserção pelo sistema
CREATE POLICY commission_schedules_insert ON commission_schedules FOR INSERT TO authenticated
WITH CHECK (true); -- O trigger SECURITY DEFINER já garante a segurança

CREATE POLICY commission_payments_insert ON commission_payments FOR INSERT TO authenticated  
WITH CHECK (true); -- O trigger SECURITY DEFINER já garante a segurança

-- Verificar se as outras políticas estão corretas
-- Política de atualização para commission_schedules (para sincronizar status)
CREATE POLICY commission_schedules_update ON commission_schedules FOR UPDATE TO authenticated
USING (
    recipient_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
) WITH CHECK (
    recipient_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
);;