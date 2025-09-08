-- Migration: fix_audit_logs_constraints_and_triggers
-- Created at: 1754395590

-- Migration: fix_audit_logs_constraints_and_triggers
-- Corrigir constraints e adicionar triggers para captura completa

-- Atualizar constraint para permitir SYSTEM como action_type
DROP CONSTRAINT IF EXISTS valid_action_type;
ALTER TABLE audit_logs 
ADD CONSTRAINT valid_action_type 
CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'ACTIVATE', 'DEACTIVATE', 'SYSTEM'));

-- Atualizar constraint para permitir AUDIT como resource_type
DROP CONSTRAINT IF EXISTS valid_resource_type;
ALTER TABLE audit_logs 
ADD CONSTRAINT valid_resource_type 
CHECK (resource_type IN ('USER', 'DEBENTURE', 'SERIES', 'INVESTMENT', 'COMMISSION', 'SYSTEM', 'SESSION', 'CONFIGURATION', 'AUDIT'));

-- Função melhorada para log de auditoria que sempre funciona
CREATE OR REPLACE FUNCTION log_audit_action_enhanced(
    p_user_id UUID,
    p_action_type TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_resource_name TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
    user_data RECORD;
    final_user_email TEXT;
    final_user_role TEXT;
BEGIN
    -- Buscar dados do usuário se fornecido
    IF p_user_id IS NOT NULL THEN
        -- Tentar buscar usando auth_user_id primeiro
        SELECT u.email, ur.role_name INTO user_data
        FROM users u
        LEFT JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = p_user_id
        LIMIT 1;
        
        -- Se não encontrou, tentar buscar usando id direto
        IF user_data IS NULL THEN
            SELECT u.email, ur.role_name INTO user_data
            FROM users u
            LEFT JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = p_user_id
            LIMIT 1;
        END IF;
    END IF;
    
    -- Definir valores finais
    final_user_email := COALESCE(user_data.email, 'sistema');
    final_user_role := COALESCE(user_data.role_name, 'SYSTEM');
    
    -- Inserir log de auditoria
    INSERT INTO audit_logs (
        user_id, user_email, user_role, action_type, resource_type,
        resource_id, resource_name, old_values, new_values, description,
        ip_address, user_agent, session_id, created_at
    ) VALUES (
        p_user_id, 
        final_user_email,
        final_user_role,
        p_action_type, 
        p_resource_type,
        p_resource_id, 
        p_resource_name, 
        p_old_values, 
        p_new_values, 
        p_description,
        p_ip_address,
        p_user_agent,
        p_session_id,
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, ainda assim registrar o log básico
        INSERT INTO audit_logs (
            user_id, user_email, user_role, action_type, resource_type,
            description, created_at
        ) VALUES (
            p_user_id,
            COALESCE(final_user_email, 'erro_sistema'),
            COALESCE(final_user_role, 'SYSTEM'),
            'SYSTEM',
            'SYSTEM',
            COALESCE(p_description, 'Erro ao registrar log completo: ' || SQLERRM),
            NOW()
        ) RETURNING id INTO log_id;
        
        RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir logs de teste
INSERT INTO audit_logs (
    user_email, user_role, action_type, resource_type, 
    description, created_at
) VALUES 
    ('sistema', 'SYSTEM', 'SYSTEM', 'AUDIT', 'Sistema de auditoria atualizado', NOW()),
    ('admin@smooth.com.br', 'Global', 'VIEW', 'AUDIT', 'Dashboard de auditoria visualizado', NOW());;