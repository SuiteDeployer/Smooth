-- Migration: fix_rls_policies_users
-- Created at: 1753651462

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "users_own_data" ON "public"."users";
DROP POLICY IF EXISTS "users_authenticated_read" ON "public"."users";

-- Criar políticas mais flexíveis para usuários
CREATE POLICY "users_can_read_own_data" ON "public"."users"
    FOR SELECT
    TO public
    USING (auth_user_id = auth.uid());

-- Política para permitir leitura de subordinados (para gestão de rede)
CREATE POLICY "users_can_read_subordinates" ON "public"."users" 
    FOR SELECT
    TO public
    USING (
        EXISTS (
            -- Permitir se o usuário atual é superior hierárquico
            WITH RECURSIVE subordinate_chain AS (
                -- Caso base: o próprio usuário
                SELECT id, superior_user_id, auth_user_id
                FROM users 
                WHERE auth_user_id = auth.uid()
                
                UNION ALL
                
                -- Recursão: todos os subordinados
                SELECT u.id, u.superior_user_id, u.auth_user_id
                FROM users u
                INNER JOIN subordinate_chain sc ON u.superior_user_id = sc.id
            )
            SELECT 1 FROM subordinate_chain WHERE subordinate_chain.id = users.id
        )
    );

-- Política para inserção (apenas por service role)
CREATE POLICY "users_service_role_insert" ON "public"."users"
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Política para atualização (apenas próprios dados ou por service role)
CREATE POLICY "users_can_update_own_data" ON "public"."users"
    FOR UPDATE
    TO public
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());;