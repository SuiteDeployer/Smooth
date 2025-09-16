-- Limpar todas as políticas RLS da tabela commissions
DROP POLICY IF EXISTS "rls_commissions_assessor_select" ON commissions;
DROP POLICY IF EXISTS "rls_commissions_delete" ON commissions;
DROP POLICY IF EXISTS "rls_commissions_escritorio_select" ON commissions;
DROP POLICY IF EXISTS "rls_commissions_global_select" ON commissions;
DROP POLICY IF EXISTS "rls_commissions_insert" ON commissions;
DROP POLICY IF EXISTS "rls_commissions_master_select" ON commissions;
DROP POLICY IF EXISTS "rls_commissions_update" ON commissions;

-- Recriar políticas seguindo EXATAMENTE o padrão de investments_select_hierarchy

-- 1. Política SELECT - seguindo o padrão de investments_select_hierarchy
CREATE POLICY "commissions_select_hierarchy" ON commissions
    FOR SELECT USING (
        (auth.uid() IS NOT NULL) AND (
            -- Global vê todas as comissões
            (EXISTS ( SELECT 1
               FROM users
              WHERE ((users.id = auth.uid()) AND ((users.user_type)::text = 'Global'::text)))) 
            OR 
            -- Master vê comissões de investimentos onde ele é master
            (EXISTS ( SELECT 1
               FROM users, investments
              WHERE ((users.id = auth.uid()) AND ((users.user_type)::text = 'Master'::text) 
                     AND (users.id = investments.master_user_id) 
                     AND (investments.id = commissions.investment_id)))) 
            OR 
            -- Escritório vê comissões de investimentos onde ele é escritório
            (EXISTS ( SELECT 1
               FROM users, investments
              WHERE ((users.id = auth.uid()) AND ((users.user_type)::text = 'Escritório'::text) 
                     AND (users.id = investments.escritorio_user_id) 
                     AND (investments.id = commissions.investment_id)))) 
            OR 
            -- Assessor vê comissões de investimentos onde ele é assessor
            (EXISTS ( SELECT 1
               FROM users, investments
              WHERE ((users.id = auth.uid()) AND ((users.user_type)::text = 'Assessor'::text) 
                     AND (users.id = investments.assessor_user_id) 
                     AND (investments.id = commissions.investment_id))))
        )
    );

-- 2. Política INSERT - seguindo o padrão de investments
CREATE POLICY "commissions_insert_authorized" ON commissions
    FOR INSERT WITH CHECK (true);

-- 3. Política UPDATE - seguindo o padrão de investments  
CREATE POLICY "commissions_update_authorized" ON commissions
    FOR UPDATE USING (
        (auth.uid() IS NOT NULL) AND (
            EXISTS ( SELECT 1
               FROM users
              WHERE ((users.id = auth.uid()) AND ((users.user_type)::text = ANY ((ARRAY['Global'::character varying, 'Master'::character varying, 'Escritório'::character varying, 'Assessor'::character varying])::text[]))))
        )
    );

-- 4. Política DELETE - seguindo o padrão de investments
CREATE POLICY "commissions_delete_authorized" ON commissions
    FOR DELETE USING (
        (auth.uid() IS NOT NULL) AND (
            EXISTS ( SELECT 1
               FROM users
              WHERE ((users.id = auth.uid()) AND ((users.user_type)::text = ANY ((ARRAY['Global'::character varying, 'Master'::character varying, 'Escritório'::character varying, 'Assessor'::character varying])::text[]))))
        )
    );

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'commissions'
ORDER BY policyname;

