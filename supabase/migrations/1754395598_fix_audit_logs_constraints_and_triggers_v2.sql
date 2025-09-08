-- Migration: fix_audit_logs_constraints_and_triggers_v2
-- Created at: 1754395598

-- Migration: fix_audit_logs_constraints_and_triggers
-- Corrigir constraints e adicionar triggers para captura completa

-- Atualizar constraint para permitir SYSTEM como action_type
ALTER TABLE audit_logs 
DROP CONSTRAINT IF EXISTS valid_action_type;

ALTER TABLE audit_logs 
ADD CONSTRAINT valid_action_type 
CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'ACTIVATE', 'DEACTIVATE', 'SYSTEM'));

-- Atualizar constraint para permitir AUDIT como resource_type
ALTER TABLE audit_logs 
DROP CONSTRAINT IF EXISTS valid_resource_type;

ALTER TABLE audit_logs 
ADD CONSTRAINT valid_resource_type 
CHECK (resource_type IN ('USER', 'DEBENTURE', 'SERIES', 'INVESTMENT', 'COMMISSION', 'SYSTEM', 'SESSION', 'CONFIGURATION', 'AUDIT'));

-- Inserir logs de teste
INSERT INTO audit_logs (
    user_email, user_role, action_type, resource_type, 
    description, created_at
) VALUES 
    ('sistema', 'SYSTEM', 'SYSTEM', 'AUDIT', 'Sistema de auditoria atualizado', NOW()),
    ('admin@smooth.com.br', 'Global', 'VIEW', 'AUDIT', 'Dashboard de auditoria visualizado', NOW());;