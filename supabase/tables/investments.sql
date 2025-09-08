CREATE TABLE investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL,
    investor_user_id UUID NOT NULL,
    assessor_user_id UUID NOT NULL,
    invested_amount DECIMAL(15,2) NOT NULL,
    investment_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    interest_type VARCHAR(20) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    contract_hash VARCHAR(255),
    contract_signed_at TIMESTAMP WITH TIME ZONE,
    auto_renewal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);