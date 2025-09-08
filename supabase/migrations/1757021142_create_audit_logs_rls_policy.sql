-- Migration: create_audit_logs_rls_policy
-- Created at: 1757021142

-- CRIAÇÃO: Políticas RLS para tabela AUDIT_LOGS
-- Restringindo acesso de Masters conforme solicitado

-- Verificar se RLS está habilitado
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Apenas Global e alguns níveis superiores podem ver logs
CREATE POLICY "audit_logs_select_restricted" ON audit_logs
FOR SELECT USING (
    -- Apenas Global pode ver todos os logs
    (EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    ))
    OR
    -- Usuário pode ver seus próprios logs
    (user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    ))
);

-- Política INSERT: Qualquer usuário autenticado pode criar logs (sistema interno)
CREATE POLICY "audit_logs_insert_authenticated" ON audit_logs
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política UPDATE: Apenas Global pode atualizar logs
CREATE POLICY "audit_logs_update_global_only" ON audit_logs
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
);

-- Política DELETE: Apenas Global pode deletar logs
CREATE POLICY "audit_logs_delete_global_only" ON audit_logs
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
);;