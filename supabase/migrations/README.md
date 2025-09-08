# Migrações do Supabase

## Lista de Migrações

### 1753680540_add_audit_query_functions.sql
- **Descrição**: Adicionou funções para consultas de logs de auditoria
- **Funcionalidades**:
  - `get_audit_logs_filtered()`: Busca logs com filtros e permissões hierárquicas
  - `get_audit_stats()`: Estatísticas de auditoria (versão inicial com bug)
- **Status**: ✅ Aplicada

### 1754016913_fix_audit_stats_function.sql
- **Descrição**: Corrige a função `get_audit_stats()` que estava falhando
- **Problema corrigido**: Erro "structure of query does not match function result type"
- **Mudanças**:
  - Reescreveu a função para retornar uma única linha com estatísticas agregadas
  - Adicionou tratamento para usuários não encontrados
  - Corrigiu a estrutura SQL da consulta
  - Adicionou valores padrão para evitar null
- **Status**: 🔄 Aguardando aplicação

## Como aplicar migrações

```bash
# Para aplicar uma migração específica
supabase db push

# Para verificar o status das migrações
supabase migration list
```

## Testando as funções

### Teste da função de logs
```sql
SELECT * FROM get_audit_logs_filtered(
    'uuid-do-usuario',
    NOW() - INTERVAL '7 days',
    NOW(),
    NULL, -- tipo de ação
    NULL, -- tipo de recurso
    10,   -- limite
    0     -- offset
);
```

### Teste da função de estatísticas
```sql
SELECT * FROM get_audit_stats(
    'uuid-do-usuario',
    30 -- últimos 30 dias
);
```
