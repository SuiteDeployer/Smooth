-- Migração para criar tabelas das áreas Manus
-- Data: 2025-09-11

-- Tabela para Comissões Manus
CREATE TABLE IF NOT EXISTS commissions_manus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'Master', 'Escritório', 'Assessor'
    commission_percentage DECIMAL(5,2) NOT NULL,
    base_amount DECIMAL(15,2) NOT NULL, -- Valor do investimento
    annual_amount DECIMAL(15,2) NOT NULL, -- Comissão anual
    monthly_amount DECIMAL(15,2) NOT NULL, -- Comissão mensal
    payment_month INTEGER NOT NULL, -- Mês do pagamento (1-12)
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_commissions_manus_investment 
        FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE,
    CONSTRAINT fk_commissions_manus_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_commissions_manus_user_type 
        CHECK (user_type IN ('Master', 'Escritório', 'Assessor')),
    CONSTRAINT chk_commissions_manus_status 
        CHECK (status IN ('pending', 'paid', 'cancelled')),
    CONSTRAINT chk_commissions_manus_payment_month 
        CHECK (payment_month >= 1 AND payment_month <= 12)
);

-- Tabela para Remunerações Manus
CREATE TABLE IF NOT EXISTS remuneracoes_manus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL,
    investor_id UUID NOT NULL,
    remuneration_percentage DECIMAL(5,2) NOT NULL,
    base_amount DECIMAL(15,2) NOT NULL, -- Valor do investimento
    annual_amount DECIMAL(15,2) NOT NULL, -- Remuneração anual
    monthly_amount DECIMAL(15,2) NOT NULL, -- Remuneração mensal
    payment_month INTEGER NOT NULL, -- Mês do pagamento (1-12)
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_remuneracoes_manus_investment 
        FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE,
    CONSTRAINT fk_remuneracoes_manus_investor 
        FOREIGN KEY (investor_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_remuneracoes_manus_status 
        CHECK (status IN ('pending', 'paid', 'cancelled')),
    CONSTRAINT chk_remuneracoes_manus_payment_month 
        CHECK (payment_month >= 1 AND payment_month <= 12)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_commissions_manus_investment_id ON commissions_manus(investment_id);
CREATE INDEX IF NOT EXISTS idx_commissions_manus_user_id ON commissions_manus(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_manus_user_type ON commissions_manus(user_type);
CREATE INDEX IF NOT EXISTS idx_commissions_manus_status ON commissions_manus(status);
CREATE INDEX IF NOT EXISTS idx_commissions_manus_due_date ON commissions_manus(due_date);

CREATE INDEX IF NOT EXISTS idx_remuneracoes_manus_investment_id ON remuneracoes_manus(investment_id);
CREATE INDEX IF NOT EXISTS idx_remuneracoes_manus_investor_id ON remuneracoes_manus(investor_id);
CREATE INDEX IF NOT EXISTS idx_remuneracoes_manus_status ON remuneracoes_manus(status);
CREATE INDEX IF NOT EXISTS idx_remuneracoes_manus_due_date ON remuneracoes_manus(due_date);

-- Comentários
COMMENT ON TABLE commissions_manus IS 'Tabela para armazenar comissões das áreas Manus com cronograma mensal';
COMMENT ON TABLE remuneracoes_manus IS 'Tabela para armazenar remunerações das áreas Manus com cronograma mensal';

