-- Migration: create_commission_triggers_and_policies
-- Created at: 1754328495

-- STEP 3: Triggers e Políticas RLS

-- Criar trigger para cálculo automático de comissões
DROP TRIGGER IF EXISTS trigger_calculate_commissions ON investments;
CREATE TRIGGER trigger_calculate_commissions
    AFTER INSERT ON investments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_investment_commissions_new();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_commission_profiles_updated_at
    BEFORE UPDATE ON commission_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_payments_updated_at
    BEFORE UPDATE ON commission_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS nas novas tabelas
ALTER TABLE commission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_imports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para commission_profiles (apenas Global pode gerenciar)
CREATE POLICY commission_profiles_select ON commission_profiles FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
);

CREATE POLICY commission_profiles_insert ON commission_profiles FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
);

CREATE POLICY commission_profiles_update ON commission_profiles FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
);

CREATE POLICY commission_profiles_delete ON commission_profiles FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
);

-- Políticas RLS para commission_schedules (usuários podem ver suas próprias comissões)
CREATE POLICY commission_schedules_select ON commission_schedules FOR SELECT TO authenticated
USING (
    recipient_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name IN ('Global', 'Master')
    )
);

-- Políticas RLS para commission_payments (mesmo que schedules)
CREATE POLICY commission_payments_select ON commission_payments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM commission_schedules cs
        WHERE cs.id = commission_schedule_id
        AND (
            cs.recipient_user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            OR
            EXISTS (
                SELECT 1 FROM users u 
                JOIN user_roles ur ON u.role_id = ur.id 
                WHERE u.auth_user_id = auth.uid() AND ur.role_name IN ('Global', 'Master')
            )
        )
    )
);

CREATE POLICY commission_payments_update ON commission_payments FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
);

-- Políticas RLS para exports e imports (apenas Global)
CREATE POLICY commission_exports_all ON commission_exports FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
);

CREATE POLICY commission_imports_all ON commission_imports FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE u.auth_user_id = auth.uid() AND ur.role_name = 'Global'
    )
);;