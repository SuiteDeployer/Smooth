-- Migration: create_remuneracoes_rls_policies
-- Created at: 1756748927

-- Habilitar RLS na tabela remuneracoes
ALTER TABLE remuneracoes ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuários podem ver remunerações baseada na hierarquia
CREATE POLICY "remuneracoes_select_policy" ON remuneracoes
  FOR SELECT
  USING (
    -- Global pode ver tudo
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN (SELECT id FROM user_roles WHERE role_name = 'Global'))
    OR
    -- Master, Escritório, Assessor podem ver baseado na hierarquia (user_id é controlado pela hierarquia)
    user_id = auth.uid()
    OR
    -- Permitir acesso baseado na hierarquia de usuários
    user_id IN (
      SELECT id FROM users 
      WHERE superior_user_id = auth.uid()
      OR id IN (
        -- Buscar usuários na hierarquia inferior do usuário atual
        WITH RECURSIVE user_hierarchy AS (
          SELECT id, superior_user_id, 1 as level
          FROM users 
          WHERE id = auth.uid()
          
          UNION ALL
          
          SELECT u.id, u.superior_user_id, uh.level + 1
          FROM users u
          INNER JOIN user_hierarchy uh ON u.superior_user_id = uh.id
          WHERE uh.level < 10 -- Limite de recursão
        )
        SELECT id FROM user_hierarchy WHERE id != auth.uid()
      )
    )
  );

-- Política INSERT: apenas usuários autorizados podem inserir
CREATE POLICY "remuneracoes_insert_policy" ON remuneracoes
  FOR INSERT
  WITH CHECK (
    -- Global pode inserir qualquer coisa
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN (SELECT id FROM user_roles WHERE role_name = 'Global'))
    OR
    -- Outros usuários só podem inserir para sua própria hierarquia
    user_id = auth.uid()
  );

-- Política UPDATE: usuários podem atualizar apenas status e data_pagamento
CREATE POLICY "remuneracoes_update_policy" ON remuneracoes
  FOR UPDATE
  USING (
    -- Global pode atualizar tudo
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN (SELECT id FROM user_roles WHERE role_name = 'Global'))
    OR
    -- Outros usuários baseado na hierarquia
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT id FROM users 
      WHERE superior_user_id = auth.uid()
      OR id IN (
        WITH RECURSIVE user_hierarchy AS (
          SELECT id, superior_user_id, 1 as level
          FROM users 
          WHERE id = auth.uid()
          
          UNION ALL
          
          SELECT u.id, u.superior_user_id, uh.level + 1
          FROM users u
          INNER JOIN user_hierarchy uh ON u.superior_user_id = uh.id
          WHERE uh.level < 10
        )
        SELECT id FROM user_hierarchy WHERE id != auth.uid()
      )
    )
  );

-- Política DELETE: apenas Global pode deletar
CREATE POLICY "remuneracoes_delete_policy" ON remuneracoes
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN (SELECT id FROM user_roles WHERE role_name = 'Global'))
  );

-- Criar índices para performance
CREATE INDEX idx_remuneracoes_user_id ON remuneracoes(user_id);
CREATE INDEX idx_remuneracoes_status ON remuneracoes(status);
CREATE INDEX idx_remuneracoes_data_vencimento ON remuneracoes(data_vencimento);
CREATE INDEX idx_remuneracoes_created_at ON remuneracoes(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_remuneracoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_remuneracoes_updated_at
    BEFORE UPDATE ON remuneracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_remuneracoes_updated_at();

-- Constraint para validar status
ALTER TABLE remuneracoes ADD CONSTRAINT check_remuneracoes_status 
  CHECK (status IN ('PENDENTE', 'PAGO', 'ERRO'));;