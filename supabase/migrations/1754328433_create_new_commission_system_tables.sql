-- Migration: create_new_commission_system_tables
-- Created at: 1754328433

-- STEP 1: Criar tabelas do novo sistema de comissões

-- 1. Tabela de Perfis de Comissão por Série
CREATE TABLE IF NOT EXISTS commission_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL, -- 'Master', 'Escritório', 'Assessor'
    percentage DECIMAL(5,2) NOT NULL, -- Ex: 0.20 para 0.20%
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(series_id, role_name),
    CHECK (percentage >= 0 AND percentage <= 100)
);

-- 2. Tabela de Cronograma de Comissões (gerado automaticamente)
CREATE TABLE IF NOT EXISTS commission_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES users(id),
    recipient_role VARCHAR(50) NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    monthly_amount DECIMAL(15,2) NOT NULL,
    payment_month DATE NOT NULL, -- Data do mês de vencimento (sempre dia 1)
    installment_number INTEGER NOT NULL, -- 1, 2, 3... até total_installments
    total_installments INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO', 'CANCELADO')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(investment_id, recipient_user_id, installment_number)
);

-- 3. Tabela de Controle de Pagamentos (com IDs únicos para planilha)
CREATE TABLE IF NOT EXISTS commission_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id VARCHAR(20) UNIQUE NOT NULL, -- ID único para planilha (ex: 102001)
    commission_schedule_id UUID NOT NULL REFERENCES commission_schedules(id),
    recipient_name VARCHAR(255) NOT NULL,
    recipient_role VARCHAR(50) NOT NULL,
    series_code VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    pix_key VARCHAR(255),
    pix_key_type VARCHAR(20), -- CPF, CNPJ, E-mail, Telefone, Aleatória
    status VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO', 'CANCELADO')),
    export_batch_id UUID, -- Referência para qual exportação pertence
    imported_at TIMESTAMPTZ, -- Quando foi reimportado após pagamento
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Histórico de Exportações
CREATE TABLE IF NOT EXISTS commission_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_month DATE NOT NULL, -- Mês de referência da exportação
    total_records INTEGER NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    file_name VARCHAR(255),
    exported_by UUID REFERENCES users(id),
    exported_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'CANCELADO'))
);

-- 5. Tabela de Histórico de Importações
CREATE TABLE IF NOT EXISTS commission_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_batch_id UUID REFERENCES commission_exports(id),
    total_records INTEGER NOT NULL,
    successful_updates INTEGER NOT NULL,
    failed_updates INTEGER NOT NULL,
    file_name VARCHAR(255),
    imported_by UUID REFERENCES users(id),
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    import_log JSONB -- Log detalhado das operações
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_commission_schedules_payment_month ON commission_schedules(payment_month);
CREATE INDEX IF NOT EXISTS idx_commission_schedules_status ON commission_schedules(status);
CREATE INDEX IF NOT EXISTS idx_commission_schedules_recipient ON commission_schedules(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_status ON commission_payments(status);
CREATE INDEX IF NOT EXISTS idx_commission_payments_export_batch ON commission_payments(export_batch_id);

-- Comentários nas tabelas
COMMENT ON TABLE commission_profiles IS 'Define os percentuais de comissão por série e nível hierárquico';
COMMENT ON TABLE commission_schedules IS 'Cronograma mensal automático de comissões gerado por investimento';
COMMENT ON TABLE commission_payments IS 'Controle individual de pagamentos com IDs únicos para planilhas';
COMMENT ON TABLE commission_exports IS 'Histórico de exportações mensais de comissões';
COMMENT ON TABLE commission_imports IS 'Histórico de importações de status de pagamento';;