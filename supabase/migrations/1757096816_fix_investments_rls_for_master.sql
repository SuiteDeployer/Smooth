-- Migration: fix_investments_rls_for_master
-- Created at: 1757096816

-- Vamos também corrigir as políticas de investimentos para que o Master veja investimentos da sua rede
-- Primeiro, vamos ver as políticas atuais
DROP POLICY IF EXISTS investments_select_simple ON investments;

-- Cria política que permite Master ver investimentos da sua rede
CREATE POLICY investments_select_master_network ON investments
FOR SELECT
USING (
  -- Global pode ver todos
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.auth_user_id = auth.uid()
    AND ur.role_name = 'Global'
  )
  OR
  -- Investidor pode ver seus próprios investimentos
  investor_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR
  -- Assessor pode ver investimentos que ele gerencia
  assessor_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  OR
  -- Master pode ver investimentos de toda sua rede (assessores subordinados)
  (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.role_id = ur.id
      WHERE u.auth_user_id = auth.uid()
      AND ur.role_name = 'Master'
    )
    AND (
      -- Investimentos de assessores diretamente subordinados
      assessor_user_id IN (
        SELECT id FROM users 
        WHERE superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      )
      OR
      -- Investimentos de assessores subordinados através de escritórios
      assessor_user_id IN (
        SELECT u2.id FROM users u2
        WHERE u2.superior_user_id IN (
          SELECT u3.id FROM users u3
          WHERE u3.superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
      )
      OR
      -- Investimentos de assessores subordinados através de hierarquia de 3 níveis
      assessor_user_id IN (
        SELECT u4.id FROM users u4
        WHERE u4.superior_user_id IN (
          SELECT u5.id FROM users u5
          WHERE u5.superior_user_id IN (
            SELECT u6.id FROM users u6
            WHERE u6.superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
          )
        )
      )
    )
  )
  OR
  -- Escritório pode ver investimentos de assessores subordinados
  (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.role_id = ur.id
      WHERE u.auth_user_id = auth.uid()
      AND ur.role_name = 'Escritório'
    )
    AND (
      assessor_user_id IN (
        SELECT id FROM users 
        WHERE superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      )
      OR
      assessor_user_id IN (
        SELECT u2.id FROM users u2
        WHERE u2.superior_user_id IN (
          SELECT u3.id FROM users u3
          WHERE u3.superior_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
      )
    )
  )
);;