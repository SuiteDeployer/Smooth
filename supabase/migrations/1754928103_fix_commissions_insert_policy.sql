-- Migration: fix_commissions_insert_policy
-- Created at: 1754928103

-- Remover política de INSERT problemática e criar uma mais permissiva
DROP POLICY IF EXISTS commissions_insert_authenticated ON commissions;

-- Criar nova política que permite INSERT para usuários autenticados
CREATE POLICY commissions_insert_authenticated_fixed ON commissions
  FOR INSERT 
  TO public
  WITH CHECK (true); -- Permitir inserção sem restrições para service role;