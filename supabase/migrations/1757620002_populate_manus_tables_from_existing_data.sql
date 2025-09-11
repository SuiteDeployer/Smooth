-- Migração para popular tabelas Manus com dados existentes
-- Data: 2025-09-11

-- Função para popular comissões Manus baseado nos investimentos existentes
CREATE OR REPLACE FUNCTION populate_commissions_manus_from_investments()
RETURNS INTEGER AS $$
DECLARE
    investment_record RECORD;
    series_record RECORD;
    user_record RECORD;
    commission_rate DECIMAL(5,2);
    annual_commission DECIMAL(15,2);
    monthly_commission DECIMAL(15,2);
    payment_date DATE;
    month_num INTEGER;
    records_created INTEGER := 0;
BEGIN
    -- Limpar dados existentes
    DELETE FROM commissions_manus;
    
    -- Iterar sobre todos os investimentos
    FOR investment_record IN 
        SELECT i.id, i.invested_amount, i.investment_date, i.assessor_user_id, i.series_id
        FROM investments i
        WHERE i.status = 'active'
    LOOP
        -- Buscar informações da série
        SELECT s.max_commission_percentage, s.duration_months
        INTO series_record
        FROM series s
        WHERE s.id = investment_record.series_id;
        
        -- Se não encontrou série, pular
        IF series_record IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Buscar hierarquia do assessor
        SELECT u.id, u.full_name, ur.role_name, u.superior_user_id
        INTO user_record
        FROM users u
        LEFT JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.id = investment_record.assessor_user_id;
        
        -- Definir distribuição padrão de comissões (baseado na taxa máxima da série)
        commission_rate := series_record.max_commission_percentage;
        annual_commission := investment_record.invested_amount * (commission_rate / 100);
        monthly_commission := annual_commission / 12;
        
        -- Gerar cronograma mensal para 12 meses
        FOR month_num IN 1..12 LOOP
            payment_date := investment_record.investment_date + INTERVAL '1 month' * month_num;
            
            -- Comissão Assessor (2% da taxa total)
            IF user_record.id IS NOT NULL THEN
                INSERT INTO commissions_manus (
                    investment_id, user_id, user_type, commission_percentage,
                    base_amount, annual_amount, monthly_amount, payment_month,
                    due_date, status
                ) VALUES (
                    investment_record.id,
                    user_record.id,
                    'Assessor',
                    2.00, -- 2% fixo para assessor
                    investment_record.invested_amount,
                    investment_record.invested_amount * 0.02, -- 2% anual
                    (investment_record.invested_amount * 0.02) / 12, -- Mensal
                    month_num,
                    payment_date,
                    'pending'
                );
                records_created := records_created + 1;
            END IF;
            
            -- Buscar Escritório (superior do assessor)
            SELECT u.id, u.full_name, ur.role_name, u.superior_user_id
            INTO user_record
            FROM users u
            LEFT JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.id = (
                SELECT superior_user_id 
                FROM users 
                WHERE id = investment_record.assessor_user_id
            );
            
            -- Comissão Escritório (2% da taxa total)
            IF user_record.id IS NOT NULL AND user_record.role_name = 'Escritório' THEN
                INSERT INTO commissions_manus (
                    investment_id, user_id, user_type, commission_percentage,
                    base_amount, annual_amount, monthly_amount, payment_month,
                    due_date, status
                ) VALUES (
                    investment_record.id,
                    user_record.id,
                    'Escritório',
                    2.00, -- 2% fixo para escritório
                    investment_record.invested_amount,
                    investment_record.invested_amount * 0.02, -- 2% anual
                    (investment_record.invested_amount * 0.02) / 12, -- Mensal
                    month_num,
                    payment_date,
                    'pending'
                );
                records_created := records_created + 1;
                
                -- Buscar Master (superior do escritório)
                SELECT u.id, u.full_name, ur.role_name
                INTO user_record
                FROM users u
                LEFT JOIN user_roles ur ON u.role_id = ur.id
                WHERE u.id = (
                    SELECT superior_user_id 
                    FROM users 
                    WHERE id = user_record.id
                );
            END IF;
            
            -- Comissão Master (8% da taxa total)
            IF user_record.id IS NOT NULL AND user_record.role_name = 'Master' THEN
                INSERT INTO commissions_manus (
                    investment_id, user_id, user_type, commission_percentage,
                    base_amount, annual_amount, monthly_amount, payment_month,
                    due_date, status
                ) VALUES (
                    investment_record.id,
                    user_record.id,
                    'Master',
                    8.00, -- 8% fixo para master
                    investment_record.invested_amount,
                    investment_record.invested_amount * 0.08, -- 8% anual
                    (investment_record.invested_amount * 0.08) / 12, -- Mensal
                    month_num,
                    payment_date,
                    'pending'
                );
                records_created := records_created + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN records_created;
END;
$$ LANGUAGE plpgsql;

-- Função para popular remunerações Manus baseado nos investimentos existentes
CREATE OR REPLACE FUNCTION populate_remuneracoes_manus_from_investments()
RETURNS INTEGER AS $$
DECLARE
    investment_record RECORD;
    series_record RECORD;
    remuneration_rate DECIMAL(5,2);
    annual_remuneration DECIMAL(15,2);
    monthly_remuneration DECIMAL(15,2);
    payment_date DATE;
    month_num INTEGER;
    records_created INTEGER := 0;
BEGIN
    -- Limpar dados existentes
    DELETE FROM remuneracoes_manus;
    
    -- Iterar sobre todos os investimentos
    FOR investment_record IN 
        SELECT i.id, i.invested_amount, i.investment_date, i.investor_user_id, i.series_id
        FROM investments i
        WHERE i.status = 'active'
    LOOP
        -- Buscar informações da série
        SELECT s.max_commission_percentage, s.duration_months
        INTO series_record
        FROM series s
        WHERE s.id = investment_record.series_id;
        
        -- Se não encontrou série, pular
        IF series_record IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Definir taxa de remuneração (mesma da série)
        remuneration_rate := series_record.max_commission_percentage;
        annual_remuneration := investment_record.invested_amount * (remuneration_rate / 100);
        monthly_remuneration := annual_remuneration / 12;
        
        -- Gerar cronograma mensal para 12 meses
        FOR month_num IN 1..12 LOOP
            payment_date := investment_record.investment_date + INTERVAL '1 month' * month_num;
            
            INSERT INTO remuneracoes_manus (
                investment_id, investor_id, remuneration_percentage,
                base_amount, annual_amount, monthly_amount, payment_month,
                due_date, status
            ) VALUES (
                investment_record.id,
                investment_record.investor_user_id,
                remuneration_rate,
                investment_record.invested_amount,
                annual_remuneration,
                monthly_remuneration,
                month_num,
                payment_date,
                'pending'
            );
            records_created := records_created + 1;
        END LOOP;
    END LOOP;
    
    RETURN records_created;
END;
$$ LANGUAGE plpgsql;

-- Executar as funções para popular as tabelas
DO $$
DECLARE
    commissions_created INTEGER;
    remuneracoes_created INTEGER;
BEGIN
    -- Popular comissões
    SELECT populate_commissions_manus_from_investments() INTO commissions_created;
    RAISE NOTICE 'Criadas % comissões Manus', commissions_created;
    
    -- Popular remunerações
    SELECT populate_remuneracoes_manus_from_investments() INTO remuneracoes_created;
    RAISE NOTICE 'Criadas % remunerações Manus', remuneracoes_created;
END $$;

