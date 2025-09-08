-- Migration: simplify_commission_calculation_logic
-- Created at: 1754330537

-- Recriar função com lógica simplificada e correta

CREATE OR REPLACE FUNCTION calculate_investment_commissions_new()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_series_duration INTEGER;
    v_registrator_role TEXT;
    v_registrator_user RECORD;
    v_escritorio_user RECORD;
    v_master_user RECORD;
    v_installment INTEGER;
    v_month_date DATE;
BEGIN
    -- Buscar duração da série
    SELECT duration_months INTO v_series_duration
    FROM series WHERE id = NEW.series_id;
    
    IF v_series_duration IS NULL THEN
        v_series_duration := 12;
    END IF;
    
    -- Identificar quem registrou o investimento
    SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type
    INTO v_registrator_user
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = NEW.assessor_user_id;
    
    v_registrator_role := v_registrator_user.role_name;
    
    -- SEMPRE buscar um Master para receber comissão
    SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type
    INTO v_master_user
    FROM users u 
    JOIN user_roles ur ON u.role_id = ur.id 
    WHERE ur.role_name = 'Master' AND u.status = 'active'
    ORDER BY u.created_at ASC -- Pegar o primeiro Master criado
    LIMIT 1;
    
    -- Buscar Escritório se registrador for Assessor
    IF v_registrator_role = 'Assessor' THEN
        -- Buscar o Escritório superior do Assessor
        SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type
        INTO v_escritorio_user
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.id = (SELECT superior_user_id FROM users WHERE id = NEW.assessor_user_id)
        AND ur.role_name = 'Escritório';
        
        -- Se não encontrou Escritório na hierarquia, pegar qualquer Escritório ativo
        IF v_escritorio_user.id IS NULL THEN
            SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type
            INTO v_escritorio_user
            FROM users u 
            JOIN user_roles ur ON u.role_id = ur.id 
            WHERE ur.role_name = 'Escritório' AND u.status = 'active'
            LIMIT 1;
        END IF;
    END IF;
    
    -- APLICAR REGRAS DE COMISSIONAMENTO CONFORME ESPECIFICADO
    
    IF v_registrator_role = 'Master' THEN
        -- REGRA: Master registra → apenas Master recebe
        PERFORM create_commission_for_recipient(v_master_user, NEW, v_series_duration);
        
    ELSIF v_registrator_role = 'Escritório' THEN
        -- REGRA: Escritório registra → Escritório + Master
        PERFORM create_commission_for_recipient(v_registrator_user, NEW, v_series_duration);
        IF v_master_user.id != v_registrator_user.id THEN
            PERFORM create_commission_for_recipient(v_master_user, NEW, v_series_duration);
        END IF;
        
    ELSIF v_registrator_role = 'Assessor' THEN
        -- REGRA: Assessor registra → Assessor + Escritório + Master
        PERFORM create_commission_for_recipient(v_registrator_user, NEW, v_series_duration);
        
        IF v_escritorio_user.id IS NOT NULL THEN
            PERFORM create_commission_for_recipient(v_escritorio_user, NEW, v_series_duration);
        END IF;
        
        IF v_master_user.id IS NOT NULL THEN
            PERFORM create_commission_for_recipient(v_master_user, NEW, v_series_duration);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar simplificada
CREATE OR REPLACE FUNCTION create_commission_for_recipient(
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
    -- Definir percentuais conforme especificação
    CASE p_recipient.role_name
        WHEN 'Master' THEN v_commission_percentage := 0.20;
        WHEN 'Escritório' THEN v_commission_percentage := 0.40;
        WHEN 'Assessor' THEN v_commission_percentage := 1.00;
        ELSE v_commission_percentage := 0.00;
    END CASE;
    
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