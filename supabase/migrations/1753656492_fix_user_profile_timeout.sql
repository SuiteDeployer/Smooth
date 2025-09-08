-- Migration: fix_user_profile_timeout
-- Created at: 1753656492

-- Desabilitar RLS temporariamente para diagnosticar
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas problemáticas
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles in their hierarchy" ON public.users;
DROP POLICY IF EXISTS "Users can insert in their hierarchy" ON public.users;
DROP POLICY IF EXISTS "Users can update in their hierarchy" ON public.users;

-- Criar política simples e eficiente
CREATE POLICY "allow_authenticated_users_full_access" ON public.users
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Reabilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;;