-- Migration: enable_rls_security
-- Created at: 1753648718

-- Ativar RLS em todas as tabelas principais
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE debentures ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hierarchy_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

-- Política para usuários: cada usuário pode ver sua própria informação e subordinados
CREATE POLICY "users_policy" ON users FOR ALL USING (
    -- Administradores globais veem tudo
    EXISTS (
        SELECT 1 FROM users u2 
        JOIN user_roles ur2 ON u2.role_id = ur2.id 
        WHERE u2.auth_user_id = auth.uid() AND ur2.role_name = 'Global'
    )
    OR
    -- Usuários podem ver a si mesmos
    auth_user_id = auth.uid()
    OR
    -- Usuários podem ver seus subordinados (caminho hierárquico)
    superior_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- Política para debêntures: apenas Global pode criar e ver todas
CREATE POLICY "debentures_policy" ON debentures FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
);

-- Política para séries: Global vê todas, outros veem séries ativas
CREATE POLICY "series_policy" ON series FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
    OR status = 'active'
);

-- Política para investimentos: usuários veem investimentos de sua rede hierárquica
CREATE POLICY "investments_policy" ON investments FOR ALL USING (
    -- Global vê tudo
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
    OR
    -- Investidor vê seus próprios investimentos
    investor_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    -- Assessor vê investimentos de seus clientes
    assessor_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- Política para notificações: usuários veem apenas suas notificações
CREATE POLICY "alerts_notifications_policy" ON alerts_notifications FOR ALL USING (
    recipient_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
);;