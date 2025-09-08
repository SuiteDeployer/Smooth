CREATE TABLE series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debenture_id UUID NOT NULL,
    series_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    minimum_investment DECIMAL(15,2) NOT NULL,
    maximum_investment DECIMAL(15,2),
    duration_months INTEGER NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    interest_type VARCHAR(20) DEFAULT 'simple',
    max_commission_percentage DECIMAL(5,2) NOT NULL,
    max_total_captation DECIMAL(15,2),
    current_captation DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);