-- Migration: simplify_all_rls_policies
-- Created at: 1753651479

-- Simplificar política de debêntures para evitar JOINs
DROP POLICY IF EXISTS "debentures_policy" ON "public"."debentures";

-- Criar políticas mais simples sem JOINs
CREATE POLICY "debentures_read_all" ON "public"."debentures"
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "debentures_insert_authenticated" ON "public"."debentures"
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "debentures_update_authenticated" ON "public"."debentures"
    FOR UPDATE
    TO public
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política flexível para séries
DROP POLICY IF EXISTS "series_select_active" ON "public"."series";

CREATE POLICY "series_read_all" ON "public"."series"
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "series_insert_authenticated" ON "public"."series"
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "series_update_authenticated" ON "public"."series"
    FOR UPDATE
    TO public
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para outras tabelas importantes
CREATE POLICY "commissions_read_all" ON "public"."commissions"
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "commissions_insert_authenticated" ON "public"."commissions"
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "hierarchy_tracking_read_all" ON "public"."hierarchy_tracking"
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "hierarchy_tracking_insert_authenticated" ON "public"."hierarchy_tracking"
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() IS NOT NULL);;