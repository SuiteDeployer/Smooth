-- Migration: add_hierarchy_gradually
-- Created at: 1757097372

-- Remove a política atual
DROP POLICY IF EXISTS users_ultra_simple ON users;

-- Adiciona funcionalidade hierárquica gradualmente
-- Usando apenas comparações diretas de campos
CREATE POLICY users_with_basic_hierarchy ON users
FOR SELECT
USING (
  -- Todos podem ver a si mesmos
  auth_user_id = auth.uid()
  OR
  -- Global (role_id específico) pode ver todos
  role_id = 'c3702780-f93e-4a0d-86c2-5afe1a431fa7'::uuid
  OR
  -- Master pode ver subordinados diretos (comparação simples de superior_user_id)
  superior_user_id = (
    SELECT u.id FROM users u 
    INNER JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.auth_user_id = auth.uid() 
    AND ur.role_name IN ('Master', 'Escritório', 'Assessor')
    LIMIT 1
  )
);;