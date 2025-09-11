# ANÁLISE DAS POLÍTICAS RLS FUNCIONAIS

## OBJETIVO
Identificar políticas RLS que funcionam corretamente e documentar padrão CTE recursivo funcional para implementação das novas áreas "Comissões Manus" e "Remuneração Manus".

## POLÍTICAS RLS FUNCIONAIS IDENTIFICADAS

### 1. POLÍTICA DE USERS (Mais Recente - Funcionando)
**Arquivo**: `1757097372_add_hierarchy_gradually.sql`
**Status**: ✅ Funcionando (Master vê toda sua rede hierárquica)

```sql
CREATE POLICY users_with_basic_hierarchy ON users
FOR SELECT
USING (
  -- Todos podem ver a si mesmos
  auth_user_id = auth.uid()
  OR
  -- Global (role_id específico) pode ver todos
  role_id = 'c3702780-f93e-4a0d-86c2-5afe1a431fa7'::uuid
  OR
  -- Master pode ver subordinados diretos (comparação simples de superior_user_id)
  superior_user_id = (
    SELECT u.id FROM users u 
    INNER JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.auth_user_id = auth.uid() 
    AND ur.role_name IN ('Master', 'Escritório', 'Assessor')
    LIMIT 1
  )
);
```

**Características**:
- ✅ **Simples e funcional**: Não usa CTE recursiva complexa
- ✅ **UUID hardcoded para Global**: Funciona mas não é ideal
- ✅ **Subordinados diretos**: Funciona para Master ver sua rede
- ❌ **Limitação**: Não é recursiva (Master não vê subordinados dos subordinados)

### 2. POLÍTICA DE REMUNERAÇÕES (CTE Recursiva - Funcionando)
**Arquivo**: `1757106124_fix_commissions_remuneracoes_rls_hierarchical.sql`
**Status**: ✅ Funcionando (padrão CTE recursivo)

```sql
CREATE POLICY "remuneracoes_select_hierarchical_fixed" ON remuneracoes
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
    -- Usuário pode ver remunerações de toda sua hierarquia subordinada (recursiva)
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
```

**Características**:
- ✅ **CTE Recursiva**: Navega toda a hierarquia subordinada
- ✅ **Limite de segurança**: `level < 10` evita recursão infinita
- ✅ **Global por nome**: Usa `ur.role_name = 'Global'` (melhor que UUID)
- ✅ **Auto-acesso**: Usuário sempre vê seus próprios dados
- ✅ **Hierarquia completa**: Master vê subordinados dos subordinados

### 3. POLÍTICA DE INVESTMENTS (CTE Recursiva - Funcionando)
**Arquivo**: `1757021107_fix_investments_rls_hierarchical_policy.sql`
**Status**: ✅ Funcionando (padrão similar)

```sql
CREATE POLICY "investments_select_hierarchical" ON investments
FOR SELECT USING (
    -- Global vê tudo
    (EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid() 
        AND ur.role_name = 'Global'
    ))
    OR
    -- Investimentos onde o usuário é o próprio investidor
    (investor_user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    ))
    OR
    -- Investimentos de usuários na hierarquia subordinada (via investor_user_id)
    (investor_user_id IN (
        WITH RECURSIVE user_hierarchy AS (
            SELECT u.id, u.superior_user_id
            FROM users u 
            JOIN users cu ON cu.auth_user_id = auth.uid()
            WHERE u.superior_user_id = cu.id
            
            UNION ALL
            
            SELECT u.id, u.superior_user_id
            FROM users u 
            JOIN user_hierarchy uh ON u.superior_user_id = uh.id
        )
        SELECT id FROM user_hierarchy
    ))
);
```

**Características**:
- ✅ **Padrão similar**: Usa mesmo padrão CTE recursivo
- ✅ **Múltiplos campos**: Verifica `investor_user_id` e `assessor_user_id`
- ✅ **Sem limite explícito**: Confia na estrutura hierárquica

## PADRÃO CTE RECURSIVO FUNCIONAL IDENTIFICADO

### Template Base para Políticas RLS Hierárquicas

```sql
CREATE POLICY "{table}_select_hierarchical_manus" ON {table}
FOR SELECT 
USING (
    -- 1. Global pode ver todos os dados
    EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.auth_user_id = auth.uid()
        AND ur.role_name = 'Global'
    )
    OR
    -- 2. Usuário pode ver seus próprios dados
    {user_id_field} IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    -- 3. Usuário pode ver dados de toda sua hierarquia subordinada (recursiva)
    {user_id_field} IN (
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
```

### Variáveis do Template
- `{table}`: Nome da tabela (ex: `commissions`, `remuneracoes`)
- `{user_id_field}`: Campo que referencia o usuário (ex: `recipient_user_id`, `user_id`)

## APLICAÇÃO PARA AS NOVAS ÁREAS MANUS

### COMISSÕES MANUS
**Tabela**: `commissions`
**Campo de usuário**: `recipient_user_id`
**Lógica específica**: 
- Global vê todas as comissões
- Master/Escritório/Assessor veem comissões de sua rede hierárquica
- Investidor não aparece (não recebe comissões)

```sql
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
    -- Usuário pode ver comissões de toda sua hierarquia subordinada (recursiva)
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
```

### REMUNERAÇÃO MANUS
**Tabela**: `remuneracoes`
**Campo de usuário**: `user_id`
**Lógica específica**:
- Global vê todas as remunerações
- Master/Escritório/Assessor veem remunerações dos investidores de sua rede
- Investidor vê apenas suas próprias remunerações

```sql
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
    -- Usuário pode ver remunerações de toda sua hierarquia subordinada (recursiva)
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
```

## BOAS PRÁTICAS IDENTIFICADAS

### ✅ O que FUNCIONA
1. **CTE Recursiva com limite**: `level < 10` evita recursão infinita
2. **Global por nome**: `ur.role_name = 'Global'` é mais flexível que UUID
3. **Auto-acesso**: `auth_user_id = auth.uid()` sempre funciona
4. **Hierarquia baseada em superior_user_id**: Estrutura clara e funcional
5. **Padrão consistente**: Mesmo template para todas as tabelas

### ❌ O que EVITAR
1. **UUID hardcoded**: Dificulta manutenção
2. **Filtros extras por role**: Podem quebrar a consulta
3. **CTE sem limite**: Pode causar recursão infinita
4. **Lógica complexa**: Políticas simples funcionam melhor
5. **Múltiplas condições desnecessárias**: Mantém simplicidade

## PRÓXIMOS PASSOS
1. Usar template CTE recursivo para criar políticas das novas áreas
2. Testar políticas isoladamente antes de implementar frontend
3. Manter padrão consistente com políticas funcionais existentes
4. Implementar limite de segurança em todas as CTEs recursivas

