-- Migration: add_audit_query_functions
-- Created at: 1753680540

-- Função para buscar logs com filtros e permissões
CREATE OR REPLACE FUNCTION get_audit_logs_filtered(
    p_user_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_action_type TEXT DEFAULT NULL,
    p_resource_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    user_email TEXT,
    user_role TEXT,
    action_type TEXT,
    resource_type TEXT,
    resource_name TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    old_values JSONB,
    new_values JSONB
) AS $$
DECLARE
    current_user_role TEXT;
    current_user_hierarchy INTEGER;
BEGIN
    -- Buscar role e hierarquia do usuário atual
    SELECT ur.role_name, ur.hierarchy_level 
    INTO current_user_role, current_user_hierarchy
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.auth_user_id = p_user_id OR u.id = p_user_id;
    
    -- Retornar logs baseado nas permissões hierárquicas
    RETURN QUERY
    SELECT 
        al.id,
        al.user_email,
        al.user_role,
        al.action_type,
        al.resource_type,
        al.resource_name,
        al.description,
        al.created_at,
        al.old_values,
        al.new_values
    FROM audit_logs al
    WHERE 
        -- Filtros de data
        (p_start_date IS NULL OR al.created_at >= p_start_date) AND
        (p_end_date IS NULL OR al.created_at <= p_end_date) AND
        
        -- Filtros de tipo
        (p_action_type IS NULL OR al.action_type = p_action_type) AND
        (p_resource_type IS NULL OR al.resource_type = p_resource_type) AND
        
        -- Filtros de permissão hierárquica
        (
            -- Global vê tudo
            current_user_role = 'Global' OR
            
            -- Master vê logs de sua rede
            (current_user_role = 'Master' AND 
             (al.user_role IN ('Master', 'Escritório', 'Assessor', 'Investidor') OR al.user_id = p_user_id)) OR
            
            -- Escritório vê logs de seus subordinados
            (current_user_role = 'Escritório' AND 
             (al.user_role IN ('Escritório', 'Assessor', 'Investidor') OR al.user_id = p_user_id)) OR
            
            -- Assessor vê seus próprios logs e de investidores
            (current_user_role = 'Assessor' AND 
             (al.user_role IN ('Assessor', 'Investidor') OR al.user_id = p_user_id)) OR
             
            -- Investidor vê apenas seus próprios logs
            (current_user_role = 'Investidor' AND al.user_id = p_user_id)
        )
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para estatísticas de auditoria
CREATE OR REPLACE FUNCTION get_audit_stats(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    total_actions BIGINT,
    actions_today BIGINT,
    most_active_users JSONB,
    action_types_count JSONB,
    resource_types_count JSONB
) AS $$
DECLARE
    current_user_role TEXT;
    start_date TIMESTAMPTZ;
    today_start TIMESTAMPTZ;
BEGIN
    -- Buscar role do usuário atual
    SELECT ur.role_name INTO current_user_role
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.auth_user_id = p_user_id OR u.id = p_user_id;
    
    start_date := NOW() - INTERVAL '1 day' * p_days;
    today_start := DATE_TRUNC('day', NOW());
    
    -- Retornar estatísticas baseadas nas permissões
    RETURN QUERY
    SELECT 
        -- Total de ações no período
        COUNT(*) as total_actions,
        
        -- Ações hoje
        COUNT(*) FILTER (WHERE created_at >= today_start) as actions_today,
        
        -- Usuários mais ativos
        (
            SELECT JSON_AGG(user_stats ORDER BY action_count DESC)
            FROM (
                SELECT user_email, COUNT(*) as action_count
                FROM audit_logs 
                WHERE created_at >= start_date
                  AND user_email IS NOT NULL
                  AND (
                      current_user_role = 'Global' OR
                      (current_user_role = 'Master' AND user_role IN ('Master', 'Escritório', 'Assessor', 'Investidor')) OR
                      (current_user_role = 'Escritório' AND user_role IN ('Escritório', 'Assessor', 'Investidor')) OR
                      (current_user_role = 'Assessor' AND user_role IN ('Assessor', 'Investidor')) OR
                      (current_user_role = 'Investidor' AND user_id = p_user_id)
                  )
                GROUP BY user_email
                LIMIT 5
            ) user_stats
        ) as most_active_users,
        
        -- Contagem por tipo de ação
        (
            SELECT JSON_OBJECT_AGG(action_type, action_count)
            FROM (
                SELECT action_type, COUNT(*) as action_count
                FROM audit_logs 
                WHERE created_at >= start_date
                  AND (
                      current_user_role = 'Global' OR
                      (current_user_role = 'Master' AND user_role IN ('Master', 'Escritório', 'Assessor', 'Investidor')) OR
                      (current_user_role = 'Escritório' AND user_role IN ('Escritório', 'Assessor', 'Investidor')) OR
                      (current_user_role = 'Assessor' AND user_role IN ('Assessor', 'Investidor')) OR
                      (current_user_role = 'Investidor' AND user_id = p_user_id)
                  )
                GROUP BY action_type
            ) action_stats
        ) as action_types_count,
        
        -- Contagem por tipo de recurso
        (
            SELECT JSON_OBJECT_AGG(resource_type, resource_count)
            FROM (
                SELECT resource_type, COUNT(*) as resource_count
                FROM audit_logs 
                WHERE created_at >= start_date
                  AND (
                      current_user_role = 'Global' OR
                      (current_user_role = 'Master' AND user_role IN ('Master', 'Escritório', 'Assessor', 'Investidor')) OR
                      (current_user_role = 'Escritório' AND user_role IN ('Escritório', 'Assessor', 'Investidor')) OR
                      (current_user_role = 'Assessor' AND user_role IN ('Assessor', 'Investidor')) OR
                      (current_user_role = 'Investidor' AND user_id = p_user_id)
                  )
                GROUP BY resource_type
            ) resource_stats
        ) as resource_types_count
    FROM audit_logs
    WHERE created_at >= start_date
      AND (
          current_user_role = 'Global' OR
          (current_user_role = 'Master' AND user_role IN ('Master', 'Escritório', 'Assessor', 'Investidor')) OR
          (current_user_role = 'Escritório' AND user_role IN ('Escritório', 'Assessor', 'Investidor')) OR
          (current_user_role = 'Assessor' AND user_role IN ('Assessor', 'Investidor')) OR
          (current_user_role = 'Investidor' AND user_id = p_user_id)
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;