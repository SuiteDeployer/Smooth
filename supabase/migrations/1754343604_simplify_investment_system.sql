-- Migration: simplify_investment_system
-- Created at: 1754343604

-- Migration: simplify_investment_system
-- Created at: 1754400000
-- Purpose: Simplificar sistema de investimentos removendo lógica de edição

-- 1. Remover lógica de UPDATE da função trigger (manter apenas INSERT)
CREATE OR REPLACE FUNCTION calculate_investment_commissions_new()
RETURNS TRIGGER AS $$
DECLARE
    v_series_duration INTEGER;
    v_recipient RECORD;
    v_commission_percentage DECIMAL(5,2);
    v_month_date DATE;
    v_schedule_id UUID;
    v_payment_id TEXT;
    v_monthly_amount DECIMAL(15,2);
    v_total_commission DECIMAL(15,2);
    v_installment INTEGER;
BEGIN
    -- **SIMPLIFICAÇÃO**: Remover lógica de UPDATE - apenas INSERT é permitido
    -- Esta função agora só é executada em INSERTs de novos investimentos
    
    -- Buscar duração da série
    SELECT duration_months INTO v_series_duration
    FROM series WHERE id = NEW.series_id;
    
    -- Se não há duração definida, usar 12 meses como padrão
    IF v_series_duration IS NULL THEN
        v_series_duration := 12;
    END IF;
    
    -- Buscar quem registrou o investimento e sua hierarquia
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
        -- Usar os percentuais corretos da tabela investments
        v_commission_percentage := CASE v_recipient.role_name
            WHEN 'Master' THEN NEW.commission_master
            WHEN 'Escritório' THEN NEW.commission_escritorio  
            WHEN 'Assessor' THEN NEW.commission_assessor
            ELSE 0.00
        END;
        
        -- Pular se a comissão for 0
        IF v_commission_percentage <= 0 THEN
            CONTINUE;
        END IF;
        
        -- Calcular valor total da comissão com fórmula correta
        v_total_commission := NEW.invested_amount * (v_commission_percentage / 100);
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
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Garantir que o trigger só funciona em INSERT (não UPDATE)
DROP TRIGGER IF EXISTS calculate_commissions_trigger ON investments;

CREATE TRIGGER calculate_commissions_trigger
    AFTER INSERT ON investments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_investment_commissions_new();

-- 3. Garantir DELETE CASCADE nas tabelas de comissão
ALTER TABLE commission_schedules 
DROP CONSTRAINT IF EXISTS commission_schedules_investment_id_fkey;

ALTER TABLE commission_schedules 
ADD CONSTRAINT commission_schedules_investment_id_fkey 
FOREIGN KEY (investment_id) REFERENCES investments(id) 
ON DELETE CASCADE;

ALTER TABLE commission_payments 
DROP CONSTRAINT IF EXISTS commission_payments_commission_schedule_id_fkey;

ALTER TABLE commission_payments 
ADD CONSTRAINT commission_payments_commission_schedule_id_fkey 
FOREIGN KEY (commission_schedule_id) REFERENCES commission_schedules(id) 
ON DELETE CASCADE;

-- 4. Comentário para documentação
COMMENT ON FUNCTION calculate_investment_commissions_new() IS 
'Função simplificada que só funciona em INSERTs. Edição de investimentos foi removida do sistema.';

-- 5. Criar função para mudar status automaticamente quando vencido
CREATE OR REPLACE FUNCTION update_expired_investments()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Atualizar investimentos vencidos para status 'liquidado'
    UPDATE investments 
    SET status = 'liquidado', updated_at = NOW()
    WHERE status = 'ativo' 
    AND maturity_date <= CURRENT_DATE;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_expired_investments() IS 
'Função para atualizar automaticamente investimentos vencidos para status liquidado';;