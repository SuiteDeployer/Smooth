-- Migration: fix_investor_hierarchy_manual
-- Created at: 1753719122

-- Corrigir hierarquia de investidores manualmente
UPDATE users 
SET superior_user_id = '89064c36-e851-4917-8b57-82200d49fa38'
WHERE id IN (
    SELECT u.id 
    FROM users u 
    JOIN user_roles ur ON u.role_id = ur.id 
    WHERE ur.role_name = 'Investidor' AND u.superior_user_id IS NULL
);;