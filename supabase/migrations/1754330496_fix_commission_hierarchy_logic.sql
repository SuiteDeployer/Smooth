-- Migration: fix_commission_hierarchy_logic
-- Created at: 1754330496

-- Corrigir lógica de hierarquia para sempre incluir Master

CREATE OR REPLACE FUNCTION calculate_investment_commissions_new()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_series_duration INTEGER;
    v_recipient RECORD;
    v_commission_profile RECORD;
    v_month_date DATE;
    v_schedule_id UUID;
    v_payment_id TEXT;
    v_monthly_amount DECIMAL(15,2);
    v_total_commission DECIMAL(15,2);
    v_installment INTEGER;
    v_registrator_role TEXT;
    v_master_user RECORD;
    v_escritorio_user RECORD;
    v_assessor_user RECORD;
BEGIN
    -- Buscar duração da série
    SELECT duration_months INTO v_series_duration
    FROM series WHERE id = NEW.series_id;
    
    IF v_series_duration IS NULL THEN
        v_series_duration := 12;
    END IF;
    
    -- Identificar quem registrou e sua role
    SELECT ur.role_name INTO v_registrator_role
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = NEW.assessor_user_id;
    
    -- LÓGICA CORRIGIDA: Identificar todos os participantes da comissão
    
    -- 1. SEMPRE buscar um Master (o primeiro Master ativo do sistema se não houver na hierarquia)
    WITH hierarchy_master AS (
        -- Buscar Master na hierarquia do registrador
        WITH RECURSIVE hierarchy AS (
            SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type, 0 as level
            FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = NEW.assessor_user_id
            
            UNION ALL
            
            SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type, h.level + 1
            FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            JOIN hierarchy h ON u.id = (
                SELECT superior_user_id FROM users WHERE id = h.id
            )
            WHERE h.level < 5
        )
        SELECT * FROM hierarchy WHERE role_name = 'Master' LIMIT 1
    )
    SELECT 
        COALESCE(hm.id, fallback.id) as id,
        COALESCE(hm.full_name, fallback.full_name) as full_name,
        'Master' as role_name,
        COALESCE(hm.pix, fallback.pix) as pix,
        COALESCE(hm.pix_key_type, fallback.pix_key_type) as pix_key_type
    INTO v_master_user
    FROM hierarchy_master hm
    FULL OUTER JOIN (
        -- Fallback: primeiro Master ativo do sistema
        SELECT u.id, u.full_name, u.pix, u.pix_key_type
        FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id 
        WHERE ur.role_name = 'Master' AND u.status = 'active'
        LIMIT 1
    ) fallback ON true;
    
    -- 2. Buscar Escritório na hierarquia (se aplicável)
    IF v_registrator_role IN ('Assessor', 'Escritório') THEN
        WITH RECURSIVE hierarchy AS (
            SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type, 0 as level
            FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = NEW.assessor_user_id
            
            UNION ALL
            
            SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type, h.level + 1
            FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            JOIN hierarchy h ON u.id = (
                SELECT superior_user_id FROM users WHERE id = h.id
            )
            WHERE h.level < 5
        )
        SELECT id, full_name, role_name, pix, pix_key_type
        INTO v_escritorio_user
        FROM hierarchy 
        WHERE role_name = 'Escritório'
        LIMIT 1;
    END IF;
    
    -- 3. Buscar Assessor (se quem registrou foi Assessor)
    IF v_registrator_role = 'Assessor' THEN
        SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type
        INTO v_assessor_user
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.id = NEW.assessor_user_id;
    END IF;
    
    -- APLICAR REGRAS DE COMISSIONAMENTO
    
    -- 1. Se MASTER registrou investimento → apenas Master recebe
    IF v_registrator_role = 'Master' THEN
        -- Apenas Master
        FOR v_recipient IN 
            SELECT 
                v_master_user.id, 
                v_master_user.full_name, 
                v_master_user.role_name, 
                v_master_user.pix, 
                v_master_user.pix_key_type
        LOOP
            PERFORM create_commission_schedule(v_recipient, NEW, v_series_duration);
        END LOOP;
        
    -- 2. Se ESCRITÓRIO registrou investimento → Escritório + Master
    ELSIF v_registrator_role = 'Escritório' THEN
        -- Escritório
        FOR v_recipient IN 
            SELECT NEW.assessor_user_id as id, u.full_name, 'Escritório' as role_name, u.pix, u.pix_key_type
            FROM users u WHERE u.id = NEW.assessor_user_id
        LOOP
            PERFORM create_commission_schedule(v_recipient, NEW, v_series_duration);
        END LOOP;
        
        -- Master (sempre)
        FOR v_recipient IN 
            SELECT v_master_user.id, v_master_user.full_name, v_master_user.role_name, v_master_user.pix, v_master_user.pix_key_type
        LOOP
            PERFORM create_commission_schedule(v_recipient, NEW, v_series_duration);
        END LOOP;
        
    -- 3. Se ASSESSOR registrou investimento → Assessor + Escritório + Master
    ELSIF v_registrator_role = 'Assessor' THEN
        -- Assessor
        FOR v_recipient IN 
            SELECT v_assessor_user.id, v_assessor_user.full_name, v_assessor_user.role_name, v_assessor_user.pix, v_assessor_user.pix_key_type
        LOOP
            PERFORM create_commission_schedule(v_recipient, NEW, v_series_duration);
        END LOOP;
        
        -- Escritório (se existe na hierarquia)
        IF v_escritorio_user.id IS NOT NULL THEN
            FOR v_recipient IN 
                SELECT v_escritorio_user.id, v_escritorio_user.full_name, v_escritorio_user.role_name, v_escritorio_user.pix, v_escritorio_user.pix_key_type
            LOOP
                PERFORM create_commission_schedule(v_recipient, NEW, v_series_duration);
            END LOOP;
        END IF;
        
        -- Master (sempre)
        FOR v_recipient IN 
            SELECT v_master_user.id, v_master_user.full_name, v_master_user.role_name, v_master_user.pix, v_master_user.pix_key_type
        LOOP
            PERFORM create_commission_schedule(v_recipient, NEW, v_series_duration);
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar para criar cronograma de comissões
CREATE OR REPLACE FUNCTION create_commission_schedule(
    p_recipient RECORD,
    p_investment RECORD,
    p_duration INTEGER
) RETURNS void AS $$
DECLARE
    v_commission_percentage DECIMAL(5,2);
    v_total_commission DECIMAL(15,2);
    v_monthly_amount DECIMAL(15,2);
    v_month_date DATE;
    v_schedule_id UUID;
    v_payment_id TEXT;
    v_installment INTEGER;
BEGIN
    -- Buscar percentual de comissão
    SELECT percentage INTO v_commission_percentage
    FROM commission_profiles cp
    WHERE cp.series_id = p_investment.series_id 
    AND cp.role_name = p_recipient.role_name;
    
    -- Valores padrão se não encontrar perfil específico
    IF v_commission_percentage IS NULL THEN
        CASE p_recipient.role_name
            WHEN 'Master' THEN v_commission_percentage := 0.20;
            WHEN 'Escritório' THEN v_commission_percentage := 0.40;
            WHEN 'Assessor' THEN v_commission_percentage := 1.00;
            ELSE v_commission_percentage := 0.00;
        END CASE;
    END IF;
    
    -- Calcular valores
    v_total_commission := p_investment.invested_amount * (v_commission_percentage / 100);
    v_monthly_amount := v_total_commission / p_duration;
    
    -- Gerar cronograma mensal
    FOR v_installment IN 1..p_duration LOOP
        v_month_date := DATE_TRUNC('month', p_investment.investment_date) + INTERVAL '1 month' * (v_installment - 1);
        
        -- Inserir no cronograma
        INSERT INTO commission_schedules (
            investment_id,
            recipient_user_id,
            recipient_role,
            commission_percentage,
            monthly_amount,
            payment_month,
            installment_number,
            total_installments
        ) VALUES (
            p_investment.id,
            p_recipient.id,
            p_recipient.role_name,
            v_commission_percentage,
            v_monthly_amount,
            v_month_date,
            v_installment,
            p_duration
        ) RETURNING id INTO v_schedule_id;
        
        -- Gerar ID único para pagamento
        v_payment_id := LPAD(nextval('commission_payment_id_seq')::TEXT, 6, '0');
        
        -- Inserir controle de pagamento
        INSERT INTO commission_payments (
            payment_id,
            commission_schedule_id,
            recipient_name,
            recipient_role,
            series_code,
            amount,
            pix_key,
            pix_key_type
        ) VALUES (
            v_payment_id,
            v_schedule_id,
            p_recipient.full_name,
            p_recipient.role_name,
            (SELECT series_code FROM series WHERE id = p_investment.series_id),
            v_monthly_amount,
            p_recipient.pix,
            p_recipient.pix_key_type
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;;