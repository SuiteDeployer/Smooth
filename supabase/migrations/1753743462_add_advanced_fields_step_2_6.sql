-- Migration: add_advanced_fields_step_2_6
-- Created at: 1753743462

-- Migration: add_advanced_fields_step_2_6
-- Adicionar campos necessários para o STEP 2.6

-- 1. Adicionar campos para exclusão lógica e investimentos passados na tabela investments
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS redemption_date DATE,
ADD COLUMN IF NOT EXISTS redemption_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS final_yield DECIMAL(8,4),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Atualizar enum de status para incluir novos valores
ALTER TABLE investments DROP CONSTRAINT IF EXISTS investments_status_check;
ALTER TABLE investments ADD CONSTRAINT investments_status_check 
CHECK (status IN ('active', 'redeemed', 'canceled', 'processing', 'pending'));

-- 3. Adicionar campos para exclusão lógica nas debêntures e séries
ALTER TABLE debentures 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE series 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- 4. Atualizar enum de status das comissões para gerenciamento avançado
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_payment_status_check;
ALTER TABLE commissions ADD CONSTRAINT commissions_payment_status_check 
CHECK (payment_status IN ('pending', 'processing', 'paid', 'canceled', 'approved', 'rejected'));

-- 5. Adicionar campos de auditoria às comissões
ALTER TABLE commissions 
ADD COLUMN IF NOT EXISTS status_changed_by UUID,
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- 6. Criar tabela para filtros salvos pelos usuários
CREATE TABLE IF NOT EXISTS saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    filter_name VARCHAR(255) NOT NULL,
    filter_type VARCHAR(50) NOT NULL, -- 'investments', 'debentures', 'commissions'
    filter_criteria JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Criar tabela para histórico de alterações (complementar ao audit_logs)
CREATE TABLE IF NOT EXISTS change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT
);

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_deleted_at ON investments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_investments_redemption_date ON investments(redemption_date);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_type ON saved_filters(filter_type);
CREATE INDEX IF NOT EXISTS idx_change_history_resource ON change_history(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_change_history_changed_by ON change_history(changed_by);

-- 9. Criar função para registrar histórico de alterações
CREATE OR REPLACE FUNCTION log_field_change(
    p_resource_type VARCHAR(50),
    p_resource_id UUID,
    p_field_name VARCHAR(100),
    p_old_value TEXT,
    p_new_value TEXT,
    p_changed_by UUID,
    p_change_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO change_history (
        resource_type,
        resource_id,
        field_name,
        old_value,
        new_value,
        changed_by,
        change_reason
    ) VALUES (
        p_resource_type,
        p_resource_id,
        p_field_name,
        p_old_value,
        p_new_value,
        p_changed_by,
        p_change_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;