-- Migration: fix_investor_hierarchy_final
-- Created at: 1753719103

-- Corrigir hierarquia de investidores vinculando ao usuário Global
UPDATE users 
SET superior_user_id = (
    SELECT u.id 
    FROM users u 
    JOIN user_roles ur ON u.role_id = ur.id 
    WHERE u.email = 'admin@smooth.com.br' AND ur.role_name = 'Global'
    LIMIT 1
)
WHERE id IN (
    SELECT u.id 
    FROM users u 
    JOIN user_roles ur ON u.role_id = ur.id 
    WHERE ur.role_name = 'Investidor' AND u.superior_user_id IS NULL
);;