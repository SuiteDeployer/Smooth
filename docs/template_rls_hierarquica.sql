-- ========================================
-- TEMPLATE DE POLÍTICA RLS HIERÁRQUICA
-- ========================================
-- 
-- Template reutilizável para criar políticas RLS que respeitam
-- a hierarquia organizacional: Global → Master → Escritório → Assessor → Investidor
--
-- Baseado nos padrões funcionais identificados nas políticas existentes
-- que funcionam corretamente (users, remuneracoes, investments)
--
-- COMO USAR:
-- 1. Substitua as variáveis {VARIAVEL} pelos valores específicos
-- 2. Execute o SQL resultante para criar a política
-- 3. Teste a política isoladamente antes de usar em produção
--
-- ========================================

-- TEMPLATE PRINCIPAL
-- Substitua as variáveis antes de executar:
-- {TABLE_NAME} = Nome da tabela (ex: commissions, remuneracoes)
-- {POLICY_NAME} = Nome da política (ex: commissions_select_hierarchical_manus)
-- {USER_ID_FIELD} = Campo que referencia o usuário (ex: recipient_user_id, user_id)

CREATE POLICY "{POLICY_NAME}" ON {TABLE_NAME}
FOR SELECT 
USING (
    -- 1. GLOBAL: Pode ver todos os dados do sistema
    EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid()
        AND ur.role_name = 'Global'
    )
    OR
    -- 2. AUTO-ACESSO: Usuário pode ver seus próprios dados
    {USER_ID_FIELD} IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    -- 3. HIERARQUIA: Usuário pode ver dados de toda sua hierarquia subordinada (recursiva)
    {USER_ID_FIELD} IN (
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
-- EXEMPLO 1: COMISSÕES MANUS
-- ========================================

-- Política RLS para a nova área "Comissões Manus"
-- Mostra comissões baseado na hierarquia organizacional

CREATE POLICY "commissions_select_hierarchical_manus" ON commissions
FOR SELECT 
USING (
    -- Global pode ver todas as comissões
    EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid()
        AND ur.role_name = 'Global'
    )
    OR
    -- Usuário pode ver suas próprias comissões
    recipient_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    -- Usuário pode ver comissões de toda sua hierarquia subordinada
    recipient_user_id IN (
        WITH RECURSIVE user_hierarchy AS (
            SELECT u.id, u.superior_user_id, 0 as level
            FROM users u 
            JOIN users cu ON cu.auth_user_id = auth.uid()
            WHERE u.superior_user_id = cu.id
            
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
-- EXEMPLO 2: REMUNERAÇÃO MANUS
-- ========================================

-- Política RLS para a nova área "Remuneração Manus"
-- Mostra remunerações dos investidores baseado na hierarquia organizacional

CREATE POLICY "remuneracoes_select_hierarchical_manus" ON remuneracoes
FOR SELECT 
USING (
    -- Global pode ver todas as remunerações
    EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid()
        AND ur.role_name = 'Global'
    )
    OR
    -- Usuário pode ver suas próprias remunerações
    user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    -- Usuário pode ver remunerações de toda sua hierarquia subordinada
    user_id IN (
        WITH RECURSIVE user_hierarchy AS (
            SELECT u.id, u.superior_user_id, 0 as level
            FROM users u 
            JOIN users cu ON cu.auth_user_id = auth.uid()
            WHERE u.superior_user_id = cu.id
            
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
-- TEMPLATE PARA OUTRAS OPERAÇÕES (INSERT, UPDATE, DELETE)
-- ========================================

-- INSERT: Apenas usuários com privilégios adequados podem inserir
CREATE POLICY "{TABLE_NAME}_insert_hierarchical_manus" ON {TABLE_NAME}
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name IN ('Global', 'Master', 'Escritório')
    )
);

-- UPDATE: Baseado na hierarquia (mesmo padrão do SELECT)
CREATE POLICY "{TABLE_NAME}_update_hierarchical_manus" ON {TABLE_NAME}
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    )
    OR
    {USER_ID_FIELD} IN (
        WITH RECURSIVE user_hierarchy AS (
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

-- DELETE: Apenas Global (mais restritivo)
CREATE POLICY "{TABLE_NAME}_delete_hierarchical_manus" ON {TABLE_NAME}
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
-- DOCUMENTAÇÃO DO TEMPLATE
-- ========================================

/*
VARIÁVEIS DO TEMPLATE:
- {TABLE_NAME}: Nome da tabela alvo
- {POLICY_NAME}: Nome único da política RLS
- {USER_ID_FIELD}: Campo que referencia users.id

LÓGICA HIERÁRQUICA:
1. Global: Vê tudo no sistema
2. Master: Vê sua rede (Escritório, Assessor, Investidor subordinados)
3. Escritório: Vê sua rede (Assessor, Investidor subordinados)
4. Assessor: Vê sua rede (Investidor subordinados)
5. Investidor: Vê apenas seus próprios dados

ESTRUTURA CTE RECURSIVA:
- Nível base: Subordinados diretos (superior_user_id = usuário_atual.id)
- Recursão: Subordinados dos subordinados (até level < 10)
- Limite de segurança: Evita recursão infinita

CAMPOS NECESSÁRIOS:
- users.auth_user_id: Identificação do usuário autenticado
- users.superior_user_id: Hierarquia organizacional
- user_roles.role_name: Papel do usuário (Global, Master, etc.)

TESTES RECOMENDADOS:
1. Testar com cada tipo de usuário (Global, Master, Escritório, Assessor, Investidor)
2. Verificar se hierarquia funciona corretamente
3. Confirmar que limite de recursão não é atingido
4. Validar que auto-acesso sempre funciona

APLICAÇÃO:
1. Substitua variáveis pelos valores específicos
2. Execute SQL para criar política
3. Teste isoladamente antes de usar em produção
4. Monitore performance da consulta recursiva
*/

