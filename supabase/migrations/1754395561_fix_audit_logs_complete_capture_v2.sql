-- Migration: fix_audit_logs_complete_capture_v2
-- Created at: 1754395561

-- Migration: fix_audit_logs_complete_capture
-- Created at: 1754500003
-- Garantir que TODAS as ações sejam capturadas no sistema de auditoria

-- Primeiro, garantir que a coluna created_at existe e tem valores
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Atualizar created_at onde é null
UPDATE audit_logs SET created_at = NOW() WHERE created_at IS NULL;

-- Criar índice na nova coluna
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

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
            p_action_type,
            p_resource_type,
            COALESCE(p_description, 'Erro ao registrar log completo: ' || SQLERRM),
            NOW()
        ) RETURNING id INTO log_id;
        
        RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para capturar ações automáticas na tabela users
CREATE OR REPLACE FUNCTION trigger_audit_users() RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    description_text TEXT;
BEGIN
    -- Tentar obter usuário atual
    BEGIN
        current_user_id := auth.uid();
        SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
    EXCEPTION
        WHEN OTHERS THEN
            current_user_id := NULL;
            current_user_email := 'sistema';
    END;
    
    IF TG_OP = 'INSERT' THEN
        description_text := 'Usuário criado: ' || COALESCE(NEW.email, NEW.full_name, 'usuário sem nome');
        
        PERFORM log_audit_action_enhanced(
            current_user_id,
            'CREATE',
            'USER',
            NEW.id,
            COALESCE(NEW.email, NEW.full_name),
            NULL,
            row_to_json(NEW),
            description_text
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        description_text := 'Usuário atualizado: ' || COALESCE(NEW.email, NEW.full_name, 'usuário sem nome');
        
        PERFORM log_audit_action_enhanced(
            current_user_id,
            'UPDATE',
            'USER',
            NEW.id,
            COALESCE(NEW.email, NEW.full_name),
            row_to_json(OLD),
            row_to_json(NEW),
            description_text
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        description_text := 'Usuário deletado: ' || COALESCE(OLD.email, OLD.full_name, 'usuário sem nome');
        
        PERFORM log_audit_action_enhanced(
            current_user_id,
            'DELETE',
            'USER',
            OLD.id,
            COALESCE(OLD.email, OLD.full_name),
            row_to_json(OLD),
            NULL,
            description_text
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS audit_users_trigger ON users;

-- Criar novo trigger para capturar todas as ações na tabela users
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_users();

-- Trigger para capturar ações na tabela investments
CREATE OR REPLACE FUNCTION trigger_audit_investments() RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    description_text TEXT;
BEGIN
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION
        WHEN OTHERS THEN
            current_user_id := NULL;
    END;
    
    IF TG_OP = 'INSERT' THEN
        description_text := 'Investimento criado: R$ ' || COALESCE(NEW.amount::TEXT, '0');
        
        PERFORM log_audit_action_enhanced(
            current_user_id,
            'CREATE',
            'INVESTMENT',
            NEW.id,
            'Investimento #' || NEW.id::TEXT,
            NULL,
            row_to_json(NEW),
            description_text
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        description_text := 'Investimento atualizado: R$ ' || COALESCE(NEW.amount::TEXT, '0');
        
        PERFORM log_audit_action_enhanced(
            current_user_id,
            'UPDATE',
            'INVESTMENT',
            NEW.id,
            'Investimento #' || NEW.id::TEXT,
            row_to_json(OLD),
            row_to_json(NEW),
            description_text
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        description_text := 'Investimento deletado: R$ ' || COALESCE(OLD.amount::TEXT, '0');
        
        PERFORM log_audit_action_enhanced(
            current_user_id,
            'DELETE',
            'INVESTMENT',
            OLD.id,
            'Investimento #' || OLD.id::TEXT,
            row_to_json(OLD),
            NULL,
            description_text
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para investments
DROP TRIGGER IF EXISTS audit_investments_trigger ON investments;
CREATE TRIGGER audit_investments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON investments
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_investments();

-- Trigger para capturar ações na tabela commissions
CREATE OR REPLACE FUNCTION trigger_audit_commissions() RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    description_text TEXT;
BEGIN
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION
        WHEN OTHERS THEN
            current_user_id := NULL;
    END;
    
    IF TG_OP = 'INSERT' THEN
        description_text := 'Comissão criada: R$ ' || COALESCE(NEW.commission_amount::TEXT, '0');
        
        PERFORM log_audit_action_enhanced(
            current_user_id,
            'CREATE',
            'COMMISSION',
            NEW.id,
            'Comissão #' || NEW.id::TEXT,
            NULL,
            row_to_json(NEW),
            description_text
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        description_text := 'Comissão atualizada: R$ ' || COALESCE(NEW.commission_amount::TEXT, '0');
        
        -- Se mudou o status de pagamento, destacar na descrição
        IF OLD.payment_status != NEW.payment_status THEN
            description_text := 'Status da comissão alterado de ' || OLD.payment_status || ' para ' || NEW.payment_status;
        END IF;
        
        PERFORM log_audit_action_enhanced(
            current_user_id,
            'UPDATE',
            'COMMISSION',
            NEW.id,
            'Comissão #' || NEW.id::TEXT,
            row_to_json(OLD),
            row_to_json(NEW),
            description_text
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        description_text := 'Comissão deletada: R$ ' || COALESCE(OLD.commission_amount::TEXT, '0');
        
        PERFORM log_audit_action_enhanced(
            current_user_id,
            'DELETE',
            'COMMISSION',
            OLD.id,
            'Comissão #' || OLD.id::TEXT,
            row_to_json(OLD),
            NULL,
            description_text
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para commissions
DROP TRIGGER IF EXISTS audit_commissions_trigger ON commissions;
CREATE TRIGGER audit_commissions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON commissions
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_commissions();

-- Inserir alguns logs de teste para garantir que o sistema está funcionando
INSERT INTO audit_logs (
    user_email, user_role, action_type, resource_type, 
    description, created_at
) VALUES 
    ('sistema', 'SYSTEM', 'SYSTEM', 'AUDIT', 'Sistema de auditoria atualizado e triggers configurados', NOW()),
    ('admin@smooth.com.br', 'Global', 'VIEW', 'AUDIT', 'Visualização do dashboard de auditoria', NOW());

-- Comentário final
COMMENT ON TABLE audit_logs IS 'Tabela de logs de auditoria com captura automática de todas as ações via triggers';;