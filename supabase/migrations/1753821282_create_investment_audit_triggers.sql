-- Migration: create_investment_audit_triggers
-- Created at: 1753821282

-- Migration: create_investment_audit_triggers
-- Criar triggers automáticos para auditoria de investimentos

-- Função de trigger para auditoria de investimentos
CREATE OR REPLACE FUNCTION trigger_investment_audit() 
RETURNS TRIGGER AS $$
DECLARE
    action_type_text TEXT;
    user_profile RECORD;
    old_json JSONB;
    new_json JSONB;
BEGIN
    -- Determinar tipo de ação
    IF TG_OP = 'UPDATE' THEN
        action_type_text := 'UPDATE';
        old_json := to_jsonb(OLD);
        new_json := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type_text := 'DELETE';
        old_json := to_jsonb(OLD);
        new_json := NULL;
    END IF;

    -- Buscar informações do usuário que fez a ação
    SELECT u.id, u.email, ur.role_name 
    INTO user_profile
    FROM users u
    LEFT JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
    LIMIT 1;

    -- Inserir log de auditoria
    INSERT INTO audit_logs (
        user_id,
        user_email,
        user_role,
        action_type,
        resource_type,
        resource_id,
        resource_name,
        old_values,
        new_values,
        description
    ) VALUES (
        COALESCE(user_profile.id, auth.uid()),
        COALESCE(user_profile.email, 'sistema'),
        COALESCE(user_profile.role_name, 'SYSTEM'),
        action_type_text,
        'INVESTMENT',
        COALESCE(NEW.id, OLD.id),
        CASE 
            WHEN NEW IS NOT NULL THEN 'Investimento: ' || COALESCE(NEW.investment_value::text, 'N/A')
            ELSE 'Investimento: ' || COALESCE(OLD.investment_value::text, 'N/A')
        END,
        old_json,
        new_json,
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 'Investimento editado'
            WHEN TG_OP = 'DELETE' THEN 'Investimento excluído'
        END
    );

    -- Retornar o registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para UPDATE
CREATE TRIGGER trigger_investments_update_audit
    AFTER UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_investment_audit();

-- Criar trigger para DELETE  
CREATE TRIGGER trigger_investments_delete_audit
    AFTER DELETE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_investment_audit();;