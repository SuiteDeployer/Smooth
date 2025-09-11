# Estado Atual das Políticas RLS - Antes das Correções

**Data**: 2025-09-10
**Objetivo**: Documentar o estado atual das políticas RLS antes das correções

## Políticas Problemáticas Identificadas

### 1. Tabela `users` - Política: `users_with_basic_hierarchy`
**Arquivo**: `supabase/migrations/1757097372_add_hierarchy_gradually.sql`
**Problema**: Usa UUID hardcoded e não implementa CTE recursiva
**Status**: PROBLEMÁTICA - Permite apenas visualização de subordinados diretos

### 2. Tabela `commissions` - Política: `commissions_select_hierarchical_with_role_filter`
**Arquivo**: `supabase/migrations/1757290446_fix_commissions_rls_with_user_type_filter.sql`
**Problema**: Filtro extra por role causa exibição de dados de toda a rede
**Status**: PROBLEMÁTICA - Mostra comissões de toda a rede em vez de apenas da própria rede

## Políticas Funcionando Corretamente

### 1. Tabela `investments` - Política: `investments_select_hierarchical`
**Arquivo**: `supabase/migrations/1757021107_fix_investments_rls_hierarchical_policy.sql`
**Status**: FUNCIONANDO - Usa CTE recursiva corretamente

### 2. Tabela `remuneracoes` - Política: `remuneracoes_select_hierarchical_fixed`
**Arquivo**: `supabase/migrations/1757106124_fix_commissions_remuneracoes_rls_hierarchical.sql`
**Status**: FUNCIONANDO - Usa CTE recursiva corretamente

## Comportamento Atual por Tipo de Usuário

### Global
- ✅ Vê todos os usuários
- ✅ Vê todos os investimentos
- ✅ Vê todas as comissões
- ✅ Vê todas as remunerações

### Master
- ❌ Vê apenas Escritórios subordinados diretos (não vê Assessores e Investidores da rede)
- ✅ Vê investimentos de toda sua rede
- ❌ Vê comissões de toda a rede (não apenas da sua rede)
- ✅ Vê remunerações de sua rede

### Escritório
- ❌ Vê apenas Assessores subordinados diretos (não vê Investidores da rede)
- ✅ Vê investimentos de toda sua rede
- ❌ Vê comissões de toda a rede (não apenas da sua rede)
- ✅ Vê remunerações de sua rede

### Assessor
- ✅ Vê Investidores subordinados diretos
- ✅ Vê investimentos de sua rede
- ❌ Vê comissões de toda a rede (não apenas da sua rede)
- ✅ Vê remunerações de sua rede

### Investidor
- ✅ Vê apenas seus próprios dados

## Arquivos de Backup Criados

- `backup/migrations_before_fix/1757097372_add_hierarchy_gradually.sql`
- `backup/migrations_before_fix/1757290446_fix_commissions_rls_with_user_type_filter.sql`

## Próximos Passos

1. Corrigir política RLS da tabela `users` (Etapas 1.2 e 1.3)
2. Corrigir política RLS da tabela `commissions` (Etapa 1.4)
3. Ajustar função `dashboard-metrics` (Etapas 2.1 e 2.2)
4. Limpar filtros redundantes do frontend (Etapas 3.1, 3.2, 3.3)

