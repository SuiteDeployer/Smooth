CREATE TABLE hierarchy_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL,
    investor_user_id UUID NOT NULL,
    assessor_user_id UUID NOT NULL,
    escritorio_user_id UUID,
    master_user_id UUID,
    global_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);