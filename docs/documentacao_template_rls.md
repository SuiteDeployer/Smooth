# DOCUMENTAÇÃO DO TEMPLATE RLS HIERÁRQUICA

## OBJETIVO
Template reutilizável para criar políticas RLS que respeitam a hierarquia organizacional do sistema Smooth Debenture.

## HIERARQUIA ORGANIZACIONAL
```
Global (vê tudo)
  └── Master (vê sua rede)
      └── Escritório (vê sua rede)
          └── Assessor (vê sua rede)
              └── Investidor (vê apenas seus dados)
```

## ESTRUTURA DO TEMPLATE

### Arquivo Principal
- **Localização**: `template_rls_hierarquica.sql`
- **Conteúdo**: Template SQL com variáveis substituíveis
- **Exemplos**: Políticas específicas para Comissões e Remuneração Manus

### Variáveis do Template
| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{TABLE_NAME}` | Nome da tabela alvo | `commissions`, `remuneracoes` |
| `{POLICY_NAME}` | Nome único da política RLS | `commissions_select_hierarchical_manus` |
| `{USER_ID_FIELD}` | Campo que referencia users.id | `recipient_user_id`, `user_id` |

## LÓGICA HIERÁRQUICA

### 1. Global (Acesso Total)
```sql
EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON u.role_id = ur.id
    WHERE u.auth_user_id = auth.uid()
    AND ur.role_name = 'Global'
)
```
- **Comportamento**: Vê todos os dados do sistema
- **Uso**: Administração e supervisão geral

### 2. Auto-Acesso (Dados Próprios)
```sql
{USER_ID_FIELD} IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
)
```
- **Comportamento**: Usuário sempre vê seus próprios dados
- **Uso**: Acesso aos dados pessoais

### 3. Hierarquia Recursiva (Rede Subordinada)
```sql
{USER_ID_FIELD} IN (
    WITH RECURSIVE user_hierarchy AS (
        -- Nível base: subordinados diretos
        SELECT u.id, u.superior_user_id, 0 as level
        FROM users u 
        JOIN users cu ON cu.auth_user_id = auth.uid()
        WHERE u.superior_user_id = cu.id
        
        UNION ALL
        
        -- Recursivo: subordinados dos subordinados
        SELECT u.id, u.superior_user_id, uh.level + 1
        FROM users u
        JOIN user_hierarchy uh ON u.superior_user_id = uh.id
        WHERE uh.level < 10  -- Limite de segurança
    )
    SELECT id FROM user_hierarchy
)
```
- **Comportamento**: Vê dados de toda a rede hierárquica subordinada
- **Uso**: Master vê Escritório+Assessor+Investidor, Escritório vê Assessor+Investidor, etc.

## TIPOS DE POLÍTICAS

### SELECT (Leitura)
- **Uso**: Controla quais dados o usuário pode visualizar
- **Lógica**: Global + Auto-acesso + Hierarquia recursiva

### INSERT (Inserção)
- **Uso**: Controla quem pode criar novos registros
- **Lógica**: Apenas Global, Master e Escritório

### UPDATE (Atualização)
- **Uso**: Controla quem pode modificar registros existentes
- **Lógica**: Global + Hierarquia recursiva (incluindo próprios dados)

### DELETE (Exclusão)
- **Uso**: Controla quem pode excluir registros
- **Lógica**: Apenas Global (mais restritivo)

## EXEMPLOS ESPECÍFICOS

### Comissões Manus
```sql
CREATE POLICY "commissions_select_hierarchical_manus" ON commissions
FOR SELECT USING (
    -- Template aplicado com:
    -- {TABLE_NAME} = commissions
    -- {POLICY_NAME} = commissions_select_hierarchical_manus
    -- {USER_ID_FIELD} = recipient_user_id
);
```

**Comportamento Esperado**:
- **Global**: Vê todas as comissões
- **Master**: Vê comissões de Escritório, Assessor de sua rede
- **Escritório**: Vê comissões de Assessor de sua rede
- **Assessor**: Vê apenas suas próprias comissões
- **Investidor**: Não vê comissões (não recebe comissões)

### Remuneração Manus
```sql
CREATE POLICY "remuneracoes_select_hierarchical_manus" ON remuneracoes
FOR SELECT USING (
    -- Template aplicado com:
    -- {TABLE_NAME} = remuneracoes
    -- {POLICY_NAME} = remuneracoes_select_hierarchical_manus
    -- {USER_ID_FIELD} = user_id
);
```

**Comportamento Esperado**:
- **Global**: Vê todas as remunerações
- **Master**: Vê remunerações de investidores de sua rede
- **Escritório**: Vê remunerações de investidores de sua rede
- **Assessor**: Vê remunerações de investidores de sua rede
- **Investidor**: Vê apenas suas próprias remunerações

## PROCESSO DE IMPLEMENTAÇÃO

### 1. Preparação
1. Identificar tabela alvo
2. Identificar campo de referência ao usuário
3. Definir nome da política

### 2. Aplicação do Template
1. Copiar template principal
2. Substituir variáveis pelos valores específicos
3. Validar sintaxe SQL

### 3. Implementação
1. Criar migração SQL
2. Executar migração no Supabase
3. Testar política isoladamente

### 4. Testes
1. Testar com cada tipo de usuário
2. Verificar hierarquia funciona corretamente
3. Confirmar performance adequada
4. Validar auto-acesso

## BOAS PRÁTICAS

### ✅ Recomendações
- **Limite de recursão**: Sempre usar `level < 10`
- **Nomes consistentes**: Seguir padrão `{table}_select_hierarchical_manus`
- **Testes isolados**: Testar cada política separadamente
- **Documentação**: Documentar comportamento esperado

### ❌ Evitar
- **Recursão sem limite**: Pode causar loops infinitos
- **Lógica complexa**: Manter simplicidade
- **UUID hardcoded**: Usar `role_name` em vez de UUID
- **Múltiplas condições**: Evitar filtros extras desnecessários

## MONITORAMENTO

### Performance
- Monitorar tempo de execução das consultas recursivas
- Verificar se limite de recursão é adequado
- Otimizar índices se necessário

### Funcionalidade
- Testar regularmente com diferentes tipos de usuário
- Verificar se hierarquia está sendo respeitada
- Confirmar que auto-acesso sempre funciona

## TROUBLESHOOTING

### Problemas Comuns
1. **Recursão infinita**: Verificar limite `level < 10`
2. **Usuário não vê próprios dados**: Verificar condição auto-acesso
3. **Global não vê tudo**: Verificar `role_name = 'Global'`
4. **Hierarquia não funciona**: Verificar `superior_user_id`

### Debugging
1. Testar CTE recursiva isoladamente
2. Verificar estrutura da tabela `users`
3. Confirmar dados de `user_roles`
4. Validar `auth.uid()` retorna valor correto

## PRÓXIMOS PASSOS
1. Aplicar template para criar políticas das novas áreas
2. Implementar migrações SQL
3. Testar políticas isoladamente
4. Integrar com frontend das novas áreas

