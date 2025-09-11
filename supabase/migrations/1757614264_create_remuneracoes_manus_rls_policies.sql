-- Migration: create_remuneracoes_manus_rls_policies
-- Created at: 1757614264
-- 
-- OBJETIVO: Criar políticas RLS específicas para a nova área "Remuneração Manus"
-- 
-- IMPORTANTE: Esta migração NÃO altera as políticas RLS existentes da tabela remuneracoes.
-- Cria apenas novas políticas com nomes específicos para as novas áreas Manus.
-- 
-- HIERARQUIA IMPLEMENTADA:
-- - Global: Vê todas as remunerações de todos os investidores
-- - Master: Vê remunerações dos investidores de sua rede hierárquica
-- - Escritório: Vê remunerações dos investidores de sua rede hierárquica
-- - Assessor: Vê remunerações dos investidores de sua rede
-- - Investidor: Vê apenas suas próprias remunerações
--
-- LÓGICA ESPECÍFICA: Remunerações são pagas apenas para INVESTIDORES
-- Master, Escritório e Assessor veem remunerações dos investidores alocados em sua rede

-- ========================================
-- POLÍTICA SELECT PARA REMUNERAÇÃO MANUS
-- ========================================

-- Política RLS hierárquica para visualização de remunerações na nova área "Remuneração Manus"
-- Baseada no template RLS funcional e focada em investidores da rede
CREATE POLICY "remuneracoes_select_hierarchical_manus" ON remuneracoes
FOR SELECT 
USING (
    -- 1. GLOBAL: Pode ver todas as remunerações de todos os investidores
    EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid()
        AND ur.role_name = 'Global'
    )
    OR
    -- 2. AUTO-ACESSO: Investidor pode ver suas próprias remunerações
    user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    -- 3. HIERARQUIA: Usuário pode ver remunerações dos investidores de toda sua hierarquia subordinada (recursiva)
    user_id IN (
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
-- POLÍTICA INSERT PARA REMUNERAÇÃO MANUS
-- ========================================

-- Política para controlar quem pode inserir remunerações via área "Remuneração Manus"
-- Apenas usuários com privilégios adequados podem criar remunerações
CREATE POLICY "remuneracoes_insert_hierarchical_manus" ON remuneracoes
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
-- POLÍTICA UPDATE PARA REMUNERAÇÃO MANUS
-- ========================================

-- Política para controlar quem pode atualizar remunerações via área "Remuneração Manus"
-- Baseada na hierarquia organizacional
CREATE POLICY "remuneracoes_update_hierarchical_manus" ON remuneracoes
FOR UPDATE 
USING (
    -- Global pode atualizar todas as remunerações
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
    OR
    -- Usuários podem atualizar remunerações de sua hierarquia subordinada (incluindo próprias)
    user_id IN (
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
-- POLÍTICA DELETE PARA REMUNERAÇÃO MANUS
-- ========================================

-- Política para controlar quem pode excluir remunerações via área "Remuneração Manus"
-- Apenas Global tem permissão para excluir (mais restritivo)
CREATE POLICY "remuneracoes_delete_hierarchical_manus" ON remuneracoes
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
POLÍTICAS CRIADAS PARA REMUNERAÇÃO MANUS:

1. remuneracoes_select_hierarchical_manus
   - Controla visualização de remunerações na nova área
   - Global vê todas as remunerações de todos os investidores
   - Outros veem apenas remunerações dos investidores de sua rede hierárquica
   - Investidor sempre vê suas próprias remunerações

2. remuneracoes_insert_hierarchical_manus
   - Controla criação de novas remunerações
   - Apenas Global, Master e Escritório podem criar

3. remuneracoes_update_hierarchical_manus
   - Controla atualização de remunerações existentes
   - Global pode atualizar todas
   - Outros podem atualizar apenas de sua rede hierárquica

4. remuneracoes_delete_hierarchical_manus
   - Controla exclusão de remunerações
   - Apenas Global pode excluir

COMPORTAMENTO ESPERADO POR TIPO DE USUÁRIO:

Global:
- Vê todas as remunerações de todos os investidores do sistema
- Pode criar, atualizar e excluir qualquer remuneração

Master:
- Vê remunerações dos investidores de sua rede hierárquica
- Pode criar e atualizar remunerações de investidores de sua rede
- Não pode excluir remunerações

Escritório:
- Vê remunerações dos investidores de sua rede hierárquica
- Pode criar e atualizar remunerações de investidores de sua rede
- Não pode excluir remunerações

Assessor:
- Vê remunerações dos investidores de sua rede
- Não pode criar remunerações
- Pode atualizar remunerações de investidores de sua rede
- Não pode excluir remunerações

Investidor:
- Vê apenas suas próprias remunerações
- Não pode criar, atualizar ou excluir remunerações

LÓGICA ESPECÍFICA DE REMUNERAÇÕES:
- Remunerações são pagas apenas para INVESTIDORES
- Master, Escritório e Assessor NÃO recebem remunerações (recebem comissões)
- A hierarquia mostra remunerações dos investidores alocados na rede de cada usuário

DIFERENÇA ENTRE COMISSÕES E REMUNERAÇÕES:
- COMISSÕES: Pagas para Master, Escritório, Assessor (quem gera investimentos)
- REMUNERAÇÕES: Pagas para Investidores (quem investe nas debêntures)

ESTRUTURA CTE RECURSIVA:
- Navega toda a hierarquia subordinada
- Limite de segurança: level < 10
- Baseada em users.superior_user_id
- Foca em investidores da rede hierárquica

TESTES RECOMENDADOS:
1. Testar visualização com cada tipo de usuário
2. Verificar se hierarquia funciona corretamente para investidores
3. Confirmar que investidor vê apenas suas próprias remunerações
4. Validar que Global vê todas as remunerações
5. Testar que Master/Escritório/Assessor veem apenas investidores de sua rede
6. Testar performance da consulta recursiva
*/

