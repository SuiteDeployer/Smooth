-- Migration: fix_investment_commission_updates_and_deletes
-- Created at: 1754342491

-- Migration para corrigir problemas de edição e deleção de investimentos

-- 1. Corrigir a função de trigger para tratar UPDATEs corretamente
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
    -- **NOVA LÓGICA**: Se for UPDATE, limpar comissões existentes primeiro
    IF TG_OP = 'UPDATE' THEN
        -- Deletar pagamentos existentes
        DELETE FROM commission_payments 
        WHERE commission_schedule_id IN (
            SELECT id FROM commission_schedules 
            WHERE investment_id = NEW.id
        );
        
        -- Deletar cronogramas existentes
        DELETE FROM commission_schedules 
        WHERE investment_id = NEW.id;
        
        -- Log para auditoria
        RAISE NOTICE 'Comissões existentes removidas para investment_id: %', NEW.id;
    END IF;
    
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

-- 2. Adicionar ON DELETE CASCADE na constraint que faltava
ALTER TABLE commission_payments 
DROP CONSTRAINT IF EXISTS commission_payments_commission_schedule_id_fkey;

ALTER TABLE commission_payments 
ADD CONSTRAINT commission_payments_commission_schedule_id_fkey 
FOREIGN KEY (commission_schedule_id) REFERENCES commission_schedules(id) 
ON DELETE CASCADE;

-- 3. Comentário para documentação
COMMENT ON FUNCTION calculate_investment_commissions_new() IS 
'Função corrigida para tratar UPDATEs de investimentos. Remove comissões existentes antes de criar novas para evitar constraint violations.';;