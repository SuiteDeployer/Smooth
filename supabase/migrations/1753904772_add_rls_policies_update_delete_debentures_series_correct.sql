-- Migration: add_rls_policies_update_delete_debentures_series_correct
-- Created at: 1753904772

-- Habilitar RLS nas tabelas se não estiver habilitado
ALTER TABLE debentures ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- Política para UPDATE em debentures - apenas usuários Global
CREATE POLICY "debentures_update_global_only" ON debentures
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.auth_user_id = auth.uid()
            AND ur.role_name = 'Global'
        )
    );

-- Política para DELETE em debentures - apenas usuários Global
CREATE POLICY "debentures_delete_global_only" ON debentures
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.auth_user_id = auth.uid()
            AND ur.role_name = 'Global'
        )
    );

-- Política para UPDATE em series - apenas usuários Global
CREATE POLICY "series_update_global_only" ON series
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.auth_user_id = auth.uid()
            AND ur.role_name = 'Global'
        )
    );

-- Política para DELETE em series - apenas usuários Global
CREATE POLICY "series_delete_global_only" ON series
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.role_id = ur.id
            WHERE u.auth_user_id = auth.uid()
            AND ur.role_name = 'Global'
        )
    );;