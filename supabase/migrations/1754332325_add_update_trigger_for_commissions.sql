-- Migration: add_update_trigger_for_commissions
-- Created at: 1754332325

-- Migration: add_update_trigger_for_commissions
-- Adicionar trigger para recalcular comissões em UPDATE também

-- Primeiro, deletar comissões incorretas do investimento original
DELETE FROM commission_payments 
WHERE commission_schedule_id IN (
    SELECT id FROM commission_schedules 
    WHERE investment_id = 'f9f8f77a-1e2e-404f-aca0-b4b3e2f6e200'
);

DELETE FROM commission_schedules 
WHERE investment_id = 'f9f8f77a-1e2e-404f-aca0-b4b3e2f6e200';

-- Criar trigger para UPDATE também
DROP TRIGGER IF EXISTS trigger_calculate_commissions_update ON investments;

CREATE TRIGGER trigger_calculate_commissions_update
    AFTER UPDATE ON investments
    FOR EACH ROW
    WHEN (OLD.commission_master IS DISTINCT FROM NEW.commission_master OR 
          OLD.commission_escritorio IS DISTINCT FROM NEW.commission_escritorio OR 
          OLD.commission_assessor IS DISTINCT FROM NEW.commission_assessor OR
          OLD.invested_amount IS DISTINCT FROM NEW.invested_amount)
    EXECUTE FUNCTION calculate_investment_commissions_new();;