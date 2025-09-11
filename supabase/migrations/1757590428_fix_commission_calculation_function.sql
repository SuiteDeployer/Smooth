-- Migration: fix_commission_calculation_function
-- Created at: 1757590428

-- Corrigir função de cálculo de comissões para usar os campos corretos
CREATE OR REPLACE FUNCTION calculate_investment_commissions_new()
RETURNS TRIGGER AS $$
DECLARE
    v_series_duration INTEGER;
    v_recipient RECORD;
    v_month_date DATE;
    v_schedule_id UUID;
    v_payment_id TEXT;
    v_monthly_amount DECIMAL(15,2);
    v_total_commission DECIMAL(15,2);
    v_installment INTEGER;
    v_commission_percentage DECIMAL(5,2);
BEGIN
    -- Buscar duração da série
    SELECT duration_months INTO v_series_duration
    FROM series WHERE id = NEW.series_id;
    
    -- Se não há duração definida, usar 12 meses como padrão
    IF v_series_duration IS NULL THEN
        v_series_duration := 12;
    END IF;
    
    -- Buscar hierarquia do assessor e calcular comissões
    FOR v_recipient IN 
        WITH RECURSIVE hierarchy AS (
            -- Começar pelo assessor
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
            WHERE h.level < 3 -- Máximo 3 níveis
        )
        SELECT * FROM hierarchy 
        WHERE role_name IN ('Master', 'Escritório', 'Assessor')
        ORDER BY level -- Ordem: Assessor (0), Escritório (1), Master (2)
    LOOP
        -- Determinar percentual de comissão baseado no role e nos campos do investimento
        CASE v_recipient.role_name
            WHEN 'Master' THEN v_commission_percentage := NEW.commission_master;
            WHEN 'Escritório' THEN v_commission_percentage := NEW.commission_escritorio;
            WHEN 'Assessor' THEN v_commission_percentage := NEW.commission_assessor;
            ELSE v_commission_percentage := 0.00;
        END CASE;
        
        -- Só processar se há comissão definida para este nível
        IF v_commission_percentage > 0 THEN
            -- Calcular valor total da comissão (percentual anual)
            v_total_commission := NEW.invested_amount * (v_commission_percentage / 100);
            
            -- Calcular valor mensal (dividir pelo número de meses)
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
                    v_commission_percentage,
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
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

