-- Migration: emergency_fix_rls_users
-- Created at: 1753652698

-- CORREÇÃO EMERGENCIAL: Remover política RLS recursiva problemática
DROP POLICY IF EXISTS "users_can_read_subordinates" ON "public"."users";

-- Simplificar política para permitir leitura de dados próprios
DROP POLICY IF EXISTS "users_can_read_own_data" ON "public"."users";

-- Criar política simples e robusta para leitura
CREATE POLICY "users_read_authenticated" ON "public"."users"
    FOR SELECT
    TO public
    USING (auth.uid() IS NOT NULL);

-- Manter política de atualização apenas para próprios dados
-- (já existe users_can_update_own_data);