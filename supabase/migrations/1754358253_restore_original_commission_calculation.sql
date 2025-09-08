-- Migration: restore_original_commission_calculation
-- Created at: 1754358253

-- Restaurar cálculo original de comissões usando os percentuais definidos no investimento
-- e dividindo pelo prazo em meses da série

CREATE OR REPLACE FUNCTION calculate_investment_commissions_new()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient RECORD;
    v_series_duration INTEGER;
    v_commission_percentage DECIMAL(5,2);
    v_total_commission DECIMAL(15,2);
    v_monthly_amount DECIMAL(15,2);
    v_installment INTEGER;
    v_month_date DATE;
    v_schedule_id UUID;
    v_payment_id VARCHAR(20);
BEGIN
    -- Buscar duração da série em meses
    SELECT duration_months INTO v_series_duration
    FROM series WHERE id = NEW.series_id;
    
    IF v_series_duration IS NULL THEN
        RAISE WARNING 'Série não encontrada para o investimento %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Buscar hierarquia do investidor e criar comissões (usando percentuais do investimento)
    FOR v_recipient IN (
        SELECT DISTINCT u.id, u.full_name, ur.role_name as role_name, u.pix, u.pix_key_type,
               CASE ur.role_name
                   WHEN 'Assessor' THEN COALESCE(NEW.commission_assessor, 0.0)
                   WHEN 'Master' THEN COALESCE(NEW.commission_master, 0.0)
                   WHEN 'Escritório' THEN COALESCE(NEW.commission_escritorio, 0.0)
                   ELSE 0.0
               END as commission_rate
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.id = NEW.assessor_user_id
           OR u.id IN (
               SELECT superior_user_id FROM users WHERE id = NEW.assessor_user_id
               UNION
               SELECT superior_user_id FROM users WHERE id = (SELECT superior_user_id FROM users WHERE id = NEW.assessor_user_id)
           )
    ) LOOP
        v_commission_percentage := v_recipient.commission_rate;
        
        IF v_commission_percentage > 0 THEN
            -- Calcular comissão total (% do valor investido)
            v_total_commission := (NEW.invested_amount * v_commission_percentage / 100);
            -- Dividir pelo prazo em meses da série
            v_monthly_amount := v_total_commission / v_series_duration;
            
            -- Gerar cronograma mensal
            FOR v_installment IN 1..v_series_duration LOOP
                v_month_date := DATE_TRUNC('month', NEW.investment_date) + INTERVAL '1 month' * (v_installment - 1);
                
                -- Inserir no cronograma COM PROTEÇÃO CONTRA DUPLICATAS
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
                ) 
                ON CONFLICT (investment_id, recipient_user_id, installment_number) 
                DO NOTHING
                RETURNING id INTO v_schedule_id;
                
                -- Só criar pagamento se o schedule foi criado (não era duplicata)
                IF v_schedule_id IS NOT NULL THEN
                    v_payment_id := LPAD(nextval('commission_payment_id_seq')::TEXT, 6, '0');
                    
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
                END IF;
                
                -- Reset para próxima iteração
                v_schedule_id := NULL;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;;