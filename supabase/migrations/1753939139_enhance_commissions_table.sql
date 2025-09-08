-- Migration: enhance_commissions_table
-- Created at: 1753939139

-- Adicionar campos necessários à tabela commissions
ALTER TABLE commissions 
ADD COLUMN IF NOT EXISTS payment_month VARCHAR(7), -- YYYY-MM format
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Adicionar comentários para documentar os novos campos
COMMENT ON COLUMN commissions.payment_month IS 'Mês de referência para pagamento da comissão no formato YYYY-MM';
COMMENT ON COLUMN commissions.status_changed_at IS 'Data e hora da última alteração de status';
COMMENT ON COLUMN commissions.approval_notes IS 'Observações sobre aprovação ou rejeição da comissão';

-- Criar função para calcular comissões automaticamente
CREATE OR REPLACE FUNCTION calculate_investment_commissions()
RETURNS TRIGGER AS $$
BEGIN
    -- Deletar comissões existentes se for uma atualização
    IF TG_OP = 'UPDATE' THEN
        DELETE FROM commissions WHERE investment_id = NEW.id;
    END IF;

    -- Obter mês atual para referência
    DECLARE
        current_month VARCHAR(7) := to_char(CURRENT_DATE, 'YYYY-MM');
        master_user_id UUID;
        escritorio_user_id UUID;
    BEGIN
        -- Buscar IDs dos usuários por role (simplificado para demonstração)
        SELECT id INTO master_user_id FROM users WHERE role_id = (SELECT id FROM user_roles WHERE role_name = 'Master') LIMIT 1;
        SELECT id INTO escritorio_user_id FROM users WHERE role_id = (SELECT id FROM user_roles WHERE role_name = 'Escritório') LIMIT 1;

        -- Inserir comissão Master se > 0
        IF NEW.commission_master > 0 THEN
            INSERT INTO commissions (
                investment_id,
                recipient_user_id,
                commission_percentage,
                commission_amount,
                commission_type,
                payment_status,
                payment_month,
                hierarchy_tracking_id
            ) VALUES (
                NEW.id,
                COALESCE(master_user_id, NEW.assessor_user_id),
                NEW.commission_master,
                (NEW.invested_amount * NEW.commission_master / 100),
                'master',
                'pending',
                current_month,
                gen_random_uuid()  -- Placeholder para hierarchy_tracking_id
            );
        END IF;

        -- Inserir comissão Escritório se > 0
        IF NEW.commission_escritorio > 0 THEN
            INSERT INTO commissions (
                investment_id,
                recipient_user_id,
                commission_percentage,
                commission_amount,
                commission_type,
                payment_status,
                payment_month,
                hierarchy_tracking_id
            ) VALUES (
                NEW.id,
                COALESCE(escritorio_user_id, NEW.assessor_user_id),
                NEW.commission_escritorio,
                (NEW.invested_amount * NEW.commission_escritorio / 100),
                'escritorio',
                'pending',
                current_month,
                gen_random_uuid()  -- Placeholder para hierarchy_tracking_id
            );
        END IF;

        -- Inserir comissão Assessor se > 0
        IF NEW.commission_assessor > 0 THEN
            INSERT INTO commissions (
                investment_id,
                recipient_user_id,
                commission_percentage,
                commission_amount,
                commission_type,
                payment_status,
                payment_month,
                hierarchy_tracking_id
            ) VALUES (
                NEW.id,
                NEW.assessor_user_id,
                NEW.commission_assessor,
                (NEW.invested_amount * NEW.commission_assessor / 100),
                'assessor',
                'pending',
                current_month,
                gen_random_uuid()  -- Placeholder para hierarchy_tracking_id
            );
        END IF;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para calcular comissões automaticamente
DROP TRIGGER IF EXISTS trigger_calculate_commissions ON investments;
CREATE TRIGGER trigger_calculate_commissions
    AFTER INSERT OR UPDATE OF commission_master, commission_escritorio, commission_assessor, invested_amount
    ON investments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_investment_commissions();;