-- Migration: fix_audit_stats_json_types
-- Created at: 1754278058

-- Migration: fix_audit_stats_json_types
-- Created at: 1754017213
-- Fixes JSON/JSONB type conversion issues in get_audit_stats function

-- Drop and recreate the function with correct JSON types
DROP FUNCTION IF EXISTS get_audit_stats(UUID, INTEGER);

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
    v_total_actions BIGINT;
    v_actions_today BIGINT;
    v_most_active_users JSONB;
    v_action_types_count JSONB;
    v_resource_types_count JSONB;
BEGIN
    -- Buscar role do usuário atual
    SELECT ur.role_name INTO current_user_role
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.auth_user_id = p_user_id OR u.id = p_user_id;
    
    -- Se não encontrar o usuário, usar role padrão mais restritivo
    IF current_user_role IS NULL THEN
        current_user_role := 'Investidor';
    END IF;
    
    start_date := NOW() - INTERVAL '1 day' * p_days;
    today_start := DATE_TRUNC('day', NOW());
    
    -- Calcular total de ações no período
    SELECT COUNT(*) INTO v_total_actions
    FROM audit_logs al
    WHERE al.created_at >= start_date
      AND (
          current_user_role = 'Global' OR
          (current_user_role = 'Master' AND al.user_role IN ('Master', 'Escritório', 'Assessor', 'Investidor')) OR
          (current_user_role = 'Escritório' AND al.user_role IN ('Escritório', 'Assessor', 'Investidor')) OR
          (current_user_role = 'Assessor' AND al.user_role IN ('Assessor', 'Investidor')) OR
          (current_user_role = 'Investidor' AND al.user_id = p_user_id)
      );
    
    -- Calcular ações de hoje
    SELECT COUNT(*) INTO v_actions_today
    FROM audit_logs al
    WHERE al.created_at >= today_start
      AND (
          current_user_role = 'Global' OR
          (current_user_role = 'Master' AND al.user_role IN ('Master', 'Escritório', 'Assessor', 'Investidor')) OR
          (current_user_role = 'Escritório' AND al.user_role IN ('Escritório', 'Assessor', 'Investidor')) OR
          (current_user_role = 'Assessor' AND al.user_role IN ('Assessor', 'Investidor')) OR
          (current_user_role = 'Investidor' AND al.user_id = p_user_id)
      );
    
    -- Usuários mais ativos (top 5) - usando JSONB_AGG
    SELECT COALESCE(
        (SELECT JSONB_AGG(user_stats ORDER BY action_count DESC)
         FROM (
             SELECT 
                 al.user_email,
                 COUNT(*) as action_count
             FROM audit_logs al
             WHERE al.created_at >= start_date
               AND al.user_email IS NOT NULL
               AND (
                   current_user_role = 'Global' OR
                   (current_user_role = 'Master' AND al.user_role IN ('Master', 'Escritório', 'Assessor', 'Investidor')) OR
                   (current_user_role = 'Escritório' AND al.user_role IN ('Escritório', 'Assessor', 'Investidor')) OR
                   (current_user_role = 'Assessor' AND al.user_role IN ('Assessor', 'Investidor')) OR
                   (current_user_role = 'Investidor' AND al.user_id = p_user_id)
               )
             GROUP BY al.user_email
             ORDER BY COUNT(*) DESC
             LIMIT 5
         ) user_stats),
        '[]'::jsonb
    ) INTO v_most_active_users;
    
    -- Contagem por tipo de ação - usando JSONB_OBJECT_AGG
    SELECT COALESCE(
        (SELECT JSONB_OBJECT_AGG(action_type, action_count)
         FROM (
             SELECT 
                 al.action_type,
                 COUNT(*) as action_count
             FROM audit_logs al
             WHERE al.created_at >= start_date
               AND (
                   current_user_role = 'Global' OR
                   (current_user_role = 'Master' AND al.user_role IN ('Master', 'Escritório', 'Assessor', 'Investidor')) OR
                   (current_user_role = 'Escritório' AND al.user_role IN ('Escritório', 'Assessor', 'Investidor')) OR
                   (current_user_role = 'Assessor' AND al.user_role IN ('Assessor', 'Investidor')) OR
                   (current_user_role = 'Investidor' AND al.user_id = p_user_id)
               )
             GROUP BY al.action_type
         ) action_stats),
        '{}'::jsonb
    ) INTO v_action_types_count;
    
    -- Contagem por tipo de recurso - usando JSONB_OBJECT_AGG
    SELECT COALESCE(
        (SELECT JSONB_OBJECT_AGG(resource_type, resource_count)
         FROM (
             SELECT 
                 al.resource_type,
                 COUNT(*) as resource_count
             FROM audit_logs al
             WHERE al.created_at >= start_date
               AND (
                   current_user_role = 'Global' OR
                   (current_user_role = 'Master' AND al.user_role IN ('Master', 'Escritório', 'Assessor', 'Investidor')) OR
                   (current_user_role = 'Escritório' AND al.user_role IN ('Escritório', 'Assessor', 'Investidor')) OR
                   (current_user_role = 'Assessor' AND al.user_role IN ('Assessor', 'Investidor')) OR
                   (current_user_role = 'Investidor' AND al.user_id = p_user_id)
               )
             GROUP BY al.resource_type
         ) resource_stats),
        '{}'::jsonb
    ) INTO v_resource_types_count;
    
    -- Retornar uma única linha com todas as estatísticas
    RETURN QUERY SELECT 
        COALESCE(v_total_actions, 0)::BIGINT,
        COALESCE(v_actions_today, 0)::BIGINT,
        COALESCE(v_most_active_users, '[]'::jsonb),
        COALESCE(v_action_types_count, '{}'::jsonb),
        COALESCE(v_resource_types_count, '{}'::jsonb);
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários sobre a função
COMMENT ON FUNCTION get_audit_stats(UUID, INTEGER) IS 'Retorna estatísticas de auditoria baseadas nas permissões hierárquicas do usuário. Corrigido para usar tipos JSONB adequadamente.';;