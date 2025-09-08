CREATE TABLE debentures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    issuer_name VARCHAR(255) NOT NULL,
    total_emission_value DECIMAL(15,2) NOT NULL,
    emission_date DATE NOT NULL,
    created_by UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    terms_and_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);