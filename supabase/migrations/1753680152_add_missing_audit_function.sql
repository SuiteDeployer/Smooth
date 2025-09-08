-- Migration: add_missing_audit_function
-- Created at: 1753680152

-- Função para log automático de ações
CREATE OR REPLACE FUNCTION log_audit_action(
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
BEGIN
    -- Buscar dados do usuário se fornecido
    IF p_user_id IS NOT NULL THEN
        SELECT u.email, ur.role_name INTO user_data
        FROM users u
        LEFT JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = p_user_id OR u.id = p_user_id
        LIMIT 1;
    END IF;
    
    -- Inserir log de auditoria
    INSERT INTO audit_logs (
        user_id, user_email, user_role, action_type, resource_type,
        resource_id, resource_name, old_values, new_values, description,
        ip_address, user_agent, session_id
    ) VALUES (
        p_user_id, 
        COALESCE(user_data.email, 'sistema'),
        COALESCE(user_data.role_name, 'SYSTEM'),
        p_action_type, 
        p_resource_type,
        p_resource_id, 
        p_resource_name, 
        p_old_values, 
        p_new_values, 
        p_description,
        p_ip_address,
        p_user_agent,
        p_session_id
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;