-- Migration: fix_investor_hierarchy
-- Created at: 1753715457

-- Corrigir hierarquia de investidores vinculando ao admin Global
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