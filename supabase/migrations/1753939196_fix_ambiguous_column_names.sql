-- Migration: fix_ambiguous_column_names
-- Created at: 1753939196

-- Corrigir função para resolver ambiguidade de nomes de colunas
CREATE OR REPLACE FUNCTION calculate_investment_commissions()
RETURNS TRIGGER AS $$
DECLARE
    current_month VARCHAR(7) := to_char(CURRENT_DATE, 'YYYY-MM');
    hierarchy_id UUID;
    master_id UUID;
    escritorio_id UUID;
    global_id UUID;
BEGIN
    -- Deletar comissões existentes se for uma atualização
    IF TG_OP = 'UPDATE' THEN
        DELETE FROM commissions WHERE investment_id = NEW.id;
    END IF;

    -- Buscar ou criar hierarchy tracking para este investimento
    SELECT id INTO hierarchy_id FROM hierarchy_tracking WHERE investment_id = NEW.id;
    
    IF hierarchy_id IS NULL THEN
        -- Buscar IDs dos usuários por role
        SELECT id INTO master_id FROM users WHERE role_id = (SELECT id FROM user_roles WHERE role_name = 'Master') LIMIT 1;
        SELECT id INTO escritorio_id FROM users WHERE role_id = (SELECT id FROM user_roles WHERE role_name = 'Escritório') LIMIT 1;
        SELECT id INTO global_id FROM users WHERE role_id = (SELECT id FROM user_roles WHERE role_name = 'Global') LIMIT 1;
        
        -- Criar entrada hierarchy tracking
        INSERT INTO hierarchy_tracking (
            investment_id,
            investor_user_id,
            assessor_user_id,
            escritorio_user_id,
            master_user_id,
            global_user_id
        ) VALUES (
            NEW.id,
            NEW.investor_user_id,
            NEW.assessor_user_id,
            COALESCE(escritorio_id, NEW.assessor_user_id),
            COALESCE(master_id, NEW.assessor_user_id),
            COALESCE(global_id, NEW.assessor_user_id)
        ) RETURNING id INTO hierarchy_id;
    END IF;

    -- Buscar os user_ids da hierarchy tracking
    SELECT ht.master_user_id, ht.escritorio_user_id 
    INTO master_id, escritorio_id
    FROM hierarchy_tracking ht 
    WHERE ht.id = hierarchy_id;

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
            COALESCE(master_id, NEW.assessor_user_id),
            NEW.commission_master,
            (NEW.invested_amount * NEW.commission_master / 100),
            'master',
            'pending',
            current_month,
            hierarchy_id
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
            COALESCE(escritorio_id, NEW.assessor_user_id),
            NEW.commission_escritorio,
            (NEW.invested_amount * NEW.commission_escritorio / 100),
            'escritorio',
            'pending',
            current_month,
            hierarchy_id
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
            hierarchy_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;