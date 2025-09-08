-- Migration: fix_commission_trigger_security
-- Created at: 1754329667

-- Corrigir execução segura do trigger de comissões

-- Recriar a função de cálculo de comissões como SECURITY DEFINER
-- para que execute com privilégios do proprietário (bypass RLS)
CREATE OR REPLACE FUNCTION calculate_investment_commissions_new()
RETURNS TRIGGER 
SECURITY DEFINER -- Esta linha é crucial!
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
BEGIN
    -- Buscar duração da série
    SELECT duration_months INTO v_series_duration
    FROM series WHERE id = NEW.series_id;
    
    -- Se não há duração definida, usar 12 meses como padrão
    IF v_series_duration IS NULL THEN
        v_series_duration := 12;
    END IF;
    
    -- Buscar quem registrou o investimento e sua hierarquia
    -- O sistema identifica automaticamente baseado no assessor_user_id
    FOR v_recipient IN 
        WITH RECURSIVE hierarchy AS (
            -- Começar pelo usuário que registrou (assessor)
            SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type, 0 as level
            FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = NEW.assessor_user_id
            
            UNION ALL
            
            -- Subir na hierarquia
            SELECT u.id, u.full_name, ur.role_name, u.pix, u.pix_key_type, h.level + 1
            FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            JOIN hierarchy h ON u.id = (
                SELECT superior_user_id FROM users WHERE id = h.id
            )
            WHERE h.level < 3 -- Máximo 3 níveis (Assessor -> Escritório -> Master)
        )
        SELECT * FROM hierarchy 
        WHERE role_name IN ('Master', 'Escritório', 'Assessor')
        ORDER BY level -- Ordem: Assessor (0), Escritório (1), Master (2)
    LOOP
        -- Buscar perfil de comissão para esta série e role
        SELECT percentage INTO v_commission_profile
        FROM commission_profiles cp
        WHERE cp.series_id = NEW.series_id 
        AND cp.role_name = v_recipient.role_name;
        
        -- Se não encontrou perfil específico, usar valor padrão baseado na role
        IF v_commission_profile.percentage IS NULL THEN
            CASE v_recipient.role_name
                WHEN 'Master' THEN v_commission_profile.percentage := 0.20;
                WHEN 'Escritório' THEN v_commission_profile.percentage := 0.40;
                WHEN 'Assessor' THEN v_commission_profile.percentage := 1.00;
                ELSE v_commission_profile.percentage := 0.00;
            END CASE;
        END IF;
        
        -- Calcular valor total da comissão
        v_total_commission := NEW.invested_amount * (v_commission_profile.percentage / 100);
        v_monthly_amount := v_total_commission / v_series_duration;
        
        -- Gerar cronograma mensal
        FOR v_installment IN 1..v_series_duration LOOP
            -- Calcular data do mês (sempre dia 1 do mês)
            v_month_date := DATE_TRUNC('month', NEW.investment_date) + INTERVAL '1 month' * (v_installment - 1);
            
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
                NEW.id,
                v_recipient.id,
                v_recipient.role_name,
                v_commission_profile.percentage,
                v_monthly_amount,
                v_month_date,
                v_installment,
                v_series_duration
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
                v_recipient.full_name,
                v_recipient.role_name,
                (SELECT series_code FROM series WHERE id = NEW.series_id),
                v_monthly_amount,
                v_recipient.pix,
                v_recipient.pix_key_type
            );
        END LOOP;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger
DROP TRIGGER IF EXISTS trigger_calculate_commissions ON investments;
CREATE TRIGGER trigger_calculate_commissions
    AFTER INSERT ON investments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_investment_commissions_new();;