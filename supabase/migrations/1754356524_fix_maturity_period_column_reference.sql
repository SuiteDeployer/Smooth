-- Migration: fix_maturity_period_column_reference
-- Created at: 1754356524

-- Corrigir referência à coluna maturity_period_months que foi removida
-- A coluna agora se chama duration_months

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
    -- Buscar duração da série em meses (CORRIGIDO: agora usa duration_months)
    SELECT duration_months INTO v_series_duration
    FROM series WHERE id = NEW.series_id;
    
    IF v_series_duration IS NULL THEN
        RAISE WARNING 'Série não encontrada para o investimento %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Buscar hierarquia do investidor e criar comissões
    FOR v_recipient IN (
        SELECT DISTINCT u.id, u.full_name, ur.name as role_name, u.pix, u.pix_key_type,
               CASE ur.name
                   WHEN 'Assessor' THEN 5.0
                   WHEN 'Master' THEN 3.0
                   WHEN 'Escritório' THEN 2.0
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
            v_total_commission := (NEW.invested_amount * v_commission_percentage / 100);
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