-- Função para calcular comissões baseadas na distribuição real do investimento
-- Seguindo MANUS_RULES: usar distribuição definida no investimento + comissão máxima da série

CREATE OR REPLACE FUNCTION calculate_investment_commissions_real()
RETURNS TRIGGER AS $$
DECLARE
    serie_record RECORD;
    max_commission DECIMAL(5,2);
    total_commission DECIMAL(5,2);
    monthly_commission DECIMAL(10,2);
    commission_month INTEGER;
    due_date_calc DATE;
BEGIN
    -- Buscar dados da série para obter comissão máxima
    SELECT max_commission_percentage INTO max_commission
    FROM series 
    WHERE id = NEW.series_id;
    
    IF max_commission IS NULL THEN
        RAISE EXCEPTION 'Série não encontrada ou sem comissão máxima definida';
    END IF;
    
    -- Calcular total de comissão distribuída
    total_commission := COALESCE(NEW.commission_master, 0) + 
                       COALESCE(NEW.commission_escritorio, 0) + 
                       COALESCE(NEW.commission_assessor, 0);
    
    -- Validar se não excede a comissão máxima
    IF total_commission > max_commission THEN
        RAISE EXCEPTION 'Total de comissão (%.2f%%) excede o máximo permitido pela série (%.2f%%)', 
                       total_commission, max_commission;
    END IF;
    
    -- Deletar comissões existentes se for uma atualização
    IF TG_OP = 'UPDATE' THEN
        DELETE FROM commissions_manus WHERE investment_id = NEW.id;
    END IF;
    
    -- Gerar comissões mensais para Master
    IF COALESCE(NEW.commission_master, 0) > 0 THEN
        monthly_commission := (NEW.invested_amount * NEW.commission_master / 100) / 12;
        
        FOR commission_month IN 1..12 LOOP
            due_date_calc := NEW.investment_date + INTERVAL '1 month' * commission_month;
            
            INSERT INTO commissions_manus (
                investment_id,
                user_id,
                user_type,
                commission_percentage,
                base_amount,
                annual_amount,
                monthly_amount,
                payment_month,
                due_date,
                status,
                created_at
            ) VALUES (
                NEW.id,
                NEW.master_id,
                'Master',
                NEW.commission_master,
                NEW.invested_amount,
                NEW.invested_amount * NEW.commission_master / 100,
                monthly_commission,
                commission_month,
                due_date_calc,
                'pending',
                NOW()
            );
        END LOOP;
    END IF;
    
    -- Gerar comissões mensais para Escritório
    IF COALESCE(NEW.commission_escritorio, 0) > 0 THEN
        monthly_commission := (NEW.invested_amount * NEW.commission_escritorio / 100) / 12;
        
        FOR commission_month IN 1..12 LOOP
            due_date_calc := NEW.investment_date + INTERVAL '1 month' * commission_month;
            
            INSERT INTO commissions_manus (
                investment_id,
                user_id,
                user_type,
                commission_percentage,
                base_amount,
                annual_amount,
                monthly_amount,
                payment_month,
                due_date,
                status,
                created_at
            ) VALUES (
                NEW.id,
                NEW.escritorio_id,
                'Escritório',
                NEW.commission_escritorio,
                NEW.invested_amount,
                NEW.invested_amount * NEW.commission_escritorio / 100,
                monthly_commission,
                commission_month,
                due_date_calc,
                'pending',
                NOW()
            );
        END LOOP;
    END IF;
    
    -- Gerar comissões mensais para Assessor
    IF COALESCE(NEW.commission_assessor, 0) > 0 THEN
        monthly_commission := (NEW.invested_amount * NEW.commission_assessor / 100) / 12;
        
        FOR commission_month IN 1..12 LOOP
            due_date_calc := NEW.investment_date + INTERVAL '1 month' * commission_month;
            
            INSERT INTO commissions_manus (
                investment_id,
                user_id,
                user_type,
                commission_percentage,
                base_amount,
                annual_amount,
                monthly_amount,
                payment_month,
                due_date,
                status,
                created_at
            ) VALUES (
                NEW.id,
                NEW.assessor_id,
                'Assessor',
                NEW.commission_assessor,
                NEW.invested_amount,
                NEW.invested_amount * NEW.commission_assessor / 100,
                monthly_commission,
                commission_month,
                due_date_calc,
                'pending',
                NOW()
            );
        END LOOP;
    END IF;
    
    -- Gerar remunerações mensais para o investidor (24% da série)
    monthly_commission := (NEW.invested_amount * 24 / 100) / 12; -- 24% é a taxa da série
    
    FOR commission_month IN 1..12 LOOP
        due_date_calc := NEW.investment_date + INTERVAL '1 month' * commission_month;
        
        INSERT INTO remuneracoes_manus (
            investment_id,
            investor_id,
            remuneration_percentage,
            base_amount,
            annual_amount,
            monthly_amount,
            payment_month,
            due_date,
            status,
            created_at
        ) VALUES (
            NEW.id,
            NEW.investor_id,
            24.00,
            NEW.invested_amount,
            NEW.invested_amount * 24 / 100,
            monthly_commission,
            commission_month,
            due_date_calc,
            'pending',
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para executar a função
DROP TRIGGER IF EXISTS trigger_calculate_commissions_real ON investments;
CREATE TRIGGER trigger_calculate_commissions_real
    AFTER INSERT OR UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_investment_commissions_real();

