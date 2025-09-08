-- Migration: fix_commissions_rls_with_user_type_filter
-- Created at: 1757290446

-- Remover política atual da tabela commissions
DROP POLICY IF EXISTS "commissions_select_hierarchical_fixed" ON commissions;

-- Criar nova política com filtro por tipo de usuário
CREATE POLICY "commissions_select_hierarchical_with_role_filter" ON commissions
FOR SELECT USING (
  -- 1. Usuários Global vêem tudo
  (EXISTS (
    SELECT 1 
    FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.auth_user_id = auth.uid() 
    AND ur.role_name = 'Global'
  ))
  OR 
  -- 2. Ver próprias comissões (apenas se for tipo permitido)
  (recipient_user_id IN (
    SELECT users.id 
    FROM users
    JOIN user_roles ur ON users.role_id = ur.id
    WHERE users.auth_user_id = auth.uid()
    AND ur.role_name IN ('Master', 'Escritório', 'Assessor')
  ))
  OR
  -- 3. Ver comissões dos subordinados na hierarquia (apenas se for tipo permitido)
  (recipient_user_id IN (
    WITH RECURSIVE user_hierarchy AS (
      SELECT u.id,
             u.superior_user_id,
             0 AS level
      FROM users u
      JOIN users cu ON cu.auth_user_id = auth.uid()
      WHERE u.superior_user_id = cu.id
      UNION ALL
      SELECT u.id,
             u.superior_user_id,
             uh.level + 1
      FROM users u
      JOIN user_hierarchy uh ON u.superior_user_id = uh.id
      WHERE uh.level < 10
    )
    SELECT uh.id 
    FROM user_hierarchy uh
    JOIN users u ON uh.id = u.id
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE ur.role_name IN ('Master', 'Escritório', 'Assessor')
  ))
);;