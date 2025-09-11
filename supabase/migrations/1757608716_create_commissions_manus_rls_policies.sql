-- Migration: create_commissions_manus_rls_policies
-- Created at: 1757608716
-- 
-- OBJETIVO: Criar políticas RLS específicas para a nova área "Comissões Manus"
-- 
-- IMPORTANTE: Esta migração NÃO altera as políticas RLS existentes da tabela commissions.
-- Cria apenas novas políticas com nomes específicos para as novas áreas Manus.
-- 
-- HIERARQUIA IMPLEMENTADA:
-- - Global: Vê todas as comissões
-- - Master: Vê comissões de sua rede hierárquica (Escritório, Assessor)
-- - Escritório: Vê comissões de sua rede hierárquica (Assessor)
-- - Assessor: Vê apenas suas próprias comissões
-- - Investidor: Não vê comissões (não recebe comissões)

-- ========================================
-- POLÍTICA SELECT PARA COMISSÕES MANUS
-- ========================================

-- Política RLS hierárquica para visualização de comissões na nova área "Comissões Manus"
-- Baseada no template RLS funcional identificado nas políticas existentes
CREATE POLICY "commissions_select_hierarchical_manus" ON commissions
FOR SELECT 
USING (
    -- 1. GLOBAL: Pode ver todas as comissões do sistema
    EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid()
        AND ur.role_name = 'Global'
    )
    OR
    -- 2. AUTO-ACESSO: Usuário pode ver suas próprias comissões
    recipient_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    -- 3. HIERARQUIA: Usuário pode ver comissões de toda sua hierarquia subordinada (recursiva)
    recipient_user_id IN (
        WITH RECURSIVE user_hierarchy AS (
            -- Nível base: usuários diretos do usuário atual
            SELECT u.id, u.superior_user_id, 0 as level
            FROM users u 
            JOIN users cu ON cu.auth_user_id = auth.uid()
            WHERE u.superior_user_id = cu.id
            
            UNION ALL
            
            -- Recursivo: todos os subordinados dos subordinados
            SELECT u.id, u.superior_user_id, uh.level + 1
            FROM users u
            JOIN user_hierarchy uh ON u.superior_user_id = uh.id
            WHERE uh.level < 10  -- Limite de segurança para evitar recursão infinita
        )
        SELECT id FROM user_hierarchy
    )
);

-- ========================================
-- POLÍTICA INSERT PARA COMISSÕES MANUS
-- ========================================

-- Política para controlar quem pode inserir comissões via área "Comissões Manus"
-- Apenas usuários com privilégios adequados podem criar comissões
CREATE POLICY "commissions_insert_hierarchical_manus" ON commissions
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name IN ('Global', 'Master', 'Escritório')
    )
);

-- ========================================
-- POLÍTICA UPDATE PARA COMISSÕES MANUS
-- ========================================

-- Política para controlar quem pode atualizar comissões via área "Comissões Manus"
-- Baseada na hierarquia organizacional
CREATE POLICY "commissions_update_hierarchical_manus" ON commissions
FOR UPDATE 
USING (
    -- Global pode atualizar todas as comissões
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
    OR
    -- Usuários podem atualizar comissões de sua hierarquia subordinada (incluindo próprias)
    recipient_user_id IN (
        WITH RECURSIVE user_hierarchy AS (
            -- Inclui o próprio usuário e seus subordinados
            SELECT u.id, u.superior_user_id, 0 as level
            FROM users u 
            JOIN users cu ON cu.auth_user_id = auth.uid()
            WHERE u.superior_user_id = cu.id OR u.auth_user_id = auth.uid()
            
            UNION ALL
            
            SELECT u.id, u.superior_user_id, uh.level + 1
            FROM users u
            JOIN user_hierarchy uh ON u.superior_user_id = uh.id
            WHERE uh.level < 10
        )
        SELECT id FROM user_hierarchy
    )
);

-- ========================================
-- POLÍTICA DELETE PARA COMISSÕES MANUS
-- ========================================

-- Política para controlar quem pode excluir comissões via área "Comissões Manus"
-- Apenas Global tem permissão para excluir (mais restritivo)
CREATE POLICY "commissions_delete_hierarchical_manus" ON commissions
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
);

-- ========================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ========================================

/*
POLÍTICAS CRIADAS PARA COMISSÕES MANUS:

1. commissions_select_hierarchical_manus
   - Controla visualização de comissões na nova área
   - Global vê tudo, outros veem apenas sua rede hierárquica
   - Usuário sempre vê suas próprias comissões

2. commissions_insert_hierarchical_manus
   - Controla criação de novas comissões
   - Apenas Global, Master e Escritório podem criar

3. commissions_update_hierarchical_manus
   - Controla atualização de comissões existentes
   - Global pode atualizar tudo
   - Outros podem atualizar apenas sua rede hierárquica

4. commissions_delete_hierarchical_manus
   - Controla exclusão de comissões
   - Apenas Global pode excluir

COMPORTAMENTO ESPERADO POR TIPO DE USUÁRIO:

Global:
- Vê todas as comissões do sistema
- Pode criar, atualizar e excluir qualquer comissão

Master:
- Vê comissões de Escritório e Assessor de sua rede
- Pode criar e atualizar comissões de sua rede
- Não pode excluir comissões

Escritório:
- Vê comissões de Assessor de sua rede
- Pode criar e atualizar comissões de sua rede
- Não pode excluir comissões

Assessor:
- Vê apenas suas próprias comissões
- Não pode criar comissões
- Pode atualizar apenas suas próprias comissões
- Não pode excluir comissões

Investidor:
- Não vê comissões (não recebe comissões)
- Não pode criar, atualizar ou excluir comissões

ESTRUTURA CTE RECURSIVA:
- Navega toda a hierarquia subordinada
- Limite de segurança: level < 10
- Baseada em users.superior_user_id

TESTES RECOMENDADOS:
1. Testar visualização com cada tipo de usuário
2. Verificar se hierarquia funciona corretamente
3. Confirmar que auto-acesso sempre funciona
4. Validar que Global vê tudo
5. Testar performance da consulta recursiva
*/

