CREATE TABLE performance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_user_id UUID NOT NULL,
    applies_to_role VARCHAR(50) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    min_monthly_captation DECIMAL(15,2),
    min_new_investors INTEGER,
    min_reinvestment_rate DECIMAL(5,2),
    measurement_period VARCHAR(20) DEFAULT 'monthly',
    penalty_type VARCHAR(50),
    penalty_action TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);