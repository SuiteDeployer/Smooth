-- Migration: fix_series_rls_policies_final
-- Created at: 1754927000

-- Remover todas as políticas existentes da tabela series
DROP POLICY IF EXISTS series_insert_authenticated ON series;
DROP POLICY IF EXISTS series_insert_global_only ON series;
DROP POLICY IF EXISTS series_select_policy ON series;
DROP POLICY IF EXISTS series_update_policy ON series;
DROP POLICY IF EXISTS series_delete_policy ON series;

-- Habilitar RLS na tabela series
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Todos os usuários autenticados podem ver séries
CREATE POLICY series_select_policy ON series
  FOR SELECT 
  TO public
  USING (auth.uid() IS NOT NULL);

-- Política INSERT: Apenas usuários Global podem criar séries
CREATE POLICY series_insert_policy ON series
  FOR INSERT 
  TO public
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_type = 'Global'
    )
  );

-- Política UPDATE: Apenas usuários Global podem atualizar séries
CREATE POLICY series_update_policy ON series
  FOR UPDATE 
  TO public
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_type = 'Global'
    )
  );

-- Política DELETE: Apenas usuários Global podem deletar séries
CREATE POLICY series_delete_policy ON series
  FOR DELETE 
  TO public
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_type = 'Global'
    )
  );

