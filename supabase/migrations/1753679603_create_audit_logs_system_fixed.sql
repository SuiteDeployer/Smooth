-- Migration: create_audit_logs_system_fixed
-- Created at: 1753679603

-- Migration: create_audit_logs_system_fixed
-- Sistema completo de logs e auditoria para rastreamento de ações

-- Tabela principal de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    action_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    resource_name TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    session_id TEXT,
    
    -- Constraints para validação
    CONSTRAINT valid_action_type CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'ACTIVATE', 'DEACTIVATE')),
    CONSTRAINT valid_resource_type CHECK (resource_type IN ('USER', 'DEBENTURE', 'SERIES', 'INVESTMENT', 'COMMISSION', 'SYSTEM', 'SESSION', 'CONFIGURATION'))
);

-- Índices para performance otimizada
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);

-- Índice composto para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created_at ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created_at ON audit_logs(resource_type, created_at DESC);;