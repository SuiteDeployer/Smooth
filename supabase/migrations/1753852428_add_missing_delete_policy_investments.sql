-- Migration: add_missing_delete_policy_investments
-- Created at: 1753852428

-- Adicionar política RLS para permitir DELETE na tabela investments
CREATE POLICY "Enable delete for authenticated users" 
ON public.investments 
FOR DELETE 
USING (auth.role() = 'authenticated');;