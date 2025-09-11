-- Migração para criar triggers automáticos das áreas Manus
-- Data: 2025-09-11

-- Função para calcular e inserir comissões Manus quando um investimento é criado
CREATE OR REPLACE FUNCTION calculate_manus_commissions_on_investment()
RETURNS TRIGGER AS $$
DECLARE
    series_record RECORD;
    user_record RECORD;
    commission_rate DECIMAL(5,2);
    annual_commission DECIMAL(15,2);
    monthly_commission DECIMAL(15,2);
    payment_date DATE;
    month_num INTEGER;
BEGIN
    -- Buscar informações da série
    SELECT s.max_commission_percentage, s.duration_months
    INTO series_record
    FROM series s
    WHERE s.id = NEW.series_id;
    
    -- Se não encontrou série, não fazer nada
    IF series_record IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Buscar hierarquia do assessor
    SELECT u.id, u.full_name, ur.role_name, u.superior_user_id
    INTO user_record
    FROM users u
    LEFT JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.id = NEW.assessor_user_id;
    
    -- Definir distribuição padrão de comissões (baseado na taxa máxima da série)
    commission_rate := series_record.max_commission_percentage;
    
    -- Gerar cronograma mensal para 12 meses
    FOR month_num IN 1..12 LOOP
        payment_date := NEW.investment_date + INTERVAL '1 month' * month_num;
        
        -- Comissão Assessor (2% da taxa total)
        IF user_record.id IS NOT NULL THEN
            INSERT INTO commissions_manus (
                investment_id, user_id, user_type, commission_percentage,
                base_amount, annual_amount, monthly_amount, payment_month,
                due_date, status
            ) VALUES (
                NEW.id,
                user_record.id,
                'Assessor',
                2.00, -- 2% fixo para assessor
                NEW.invested_amount,
                NEW.invested_amount * 0.02, -- 2% anual
                (NEW.invested_amount * 0.02) / 12, -- Mensal
                month_num,
                payment_date,
                'pending'
            );
        END IF;
        
        -- Buscar Escritório (superior do assessor)
        SELECT u.id, u.full_name, ur.role_name, u.superior_user_id
        INTO user_record
        FROM users u
        LEFT JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.id = (
            SELECT superior_user_id 
            FROM users 
            WHERE id = NEW.assessor_user_id
        );
        
        -- Comissão Escritório (2% da taxa total)
        IF user_record.id IS NOT NULL AND user_record.role_name = 'Escritório' THEN
            INSERT INTO commissions_manus (
                investment_id, user_id, user_type, commission_percentage,
                base_amount, annual_amount, monthly_amount, payment_month,
                due_date, status
            ) VALUES (
                NEW.id,
                user_record.id,
                'Escritório',
                2.00, -- 2% fixo para escritório
                NEW.invested_amount,
                NEW.invested_amount * 0.02, -- 2% anual
                (NEW.invested_amount * 0.02) / 12, -- Mensal
                month_num,
                payment_date,
                'pending'
            );
            
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
                NEW.id,
                user_record.id,
                'Master',
                8.00, -- 8% fixo para master
                NEW.invested_amount,
                NEW.invested_amount * 0.08, -- 8% anual
                (NEW.invested_amount * 0.08) / 12, -- Mensal
                month_num,
                payment_date,
                'pending'
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular e inserir remunerações Manus quando um investimento é criado
CREATE OR REPLACE FUNCTION calculate_manus_remuneracoes_on_investment()
RETURNS TRIGGER AS $$
DECLARE
    series_record RECORD;
    remuneration_rate DECIMAL(5,2);
    annual_remuneration DECIMAL(15,2);
    monthly_remuneration DECIMAL(15,2);
    payment_date DATE;
    month_num INTEGER;
BEGIN
    -- Buscar informações da série
    SELECT s.max_commission_percentage, s.duration_months
    INTO series_record
    FROM series s
    WHERE s.id = NEW.series_id;
    
    -- Se não encontrou série, não fazer nada
    IF series_record IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Definir taxa de remuneração (mesma da série)
    remuneration_rate := series_record.max_commission_percentage;
    annual_remuneration := NEW.invested_amount * (remuneration_rate / 100);
    monthly_remuneration := annual_remuneration / 12;
    
    -- Gerar cronograma mensal para 12 meses
    FOR month_num IN 1..12 LOOP
        payment_date := NEW.investment_date + INTERVAL '1 month' * month_num;
        
        INSERT INTO remuneracoes_manus (
            investment_id, investor_id, remuneration_percentage,
            base_amount, annual_amount, monthly_amount, payment_month,
            due_date, status
        ) VALUES (
            NEW.id,
            NEW.investor_user_id,
            remuneration_rate,
            NEW.invested_amount,
            annual_remuneration,
            monthly_remuneration,
            month_num,
            payment_date,
            'pending'
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para executar as funções automaticamente
DROP TRIGGER IF EXISTS trigger_calculate_manus_commissions ON investments;
CREATE TRIGGER trigger_calculate_manus_commissions
    AFTER INSERT ON investments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_manus_commissions_on_investment();

DROP TRIGGER IF EXISTS trigger_calculate_manus_remuneracoes ON investments;
CREATE TRIGGER trigger_calculate_manus_remuneracoes
    AFTER INSERT ON investments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_manus_remuneracoes_on_investment();

-- Comentários
COMMENT ON FUNCTION calculate_manus_commissions_on_investment() IS 'Função para calcular comissões Manus automaticamente quando um investimento é criado';
COMMENT ON FUNCTION calculate_manus_remuneracoes_on_investment() IS 'Função para calcular remunerações Manus automaticamente quando um investimento é criado';

