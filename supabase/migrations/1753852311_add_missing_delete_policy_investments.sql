-- Migration: add_missing_delete_policy_investments
-- Created at: 1753852311

-- Adicionar política RLS para DELETE na tabela investments
CREATE POLICY "investments_delete_all" ON "public"."investments"
AS PERMISSIVE FOR DELETE
TO public
USING (true);

-- Também adicionar política para UPDATE caso esteja faltando
CREATE POLICY "investments_update_all" ON "public"."investments"
AS PERMISSIVE FOR UPDATE
TO public
USING (true)
WITH CHECK (true);;