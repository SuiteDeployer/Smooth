CREATE TABLE contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    contract_content TEXT NOT NULL,
    contract_hash VARCHAR(255) NOT NULL UNIQUE,
    signed_by_investor_at TIMESTAMP WITH TIME ZONE,
    signed_by_issuer_at TIMESTAMP WITH TIME ZONE,
    document_url TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);