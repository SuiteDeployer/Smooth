# Enhanced User Management Function

Esta edge function implementa o sistema completo de gestão de usuários com hierarquia flexível.

## Funcionalidades

### Gestão de Rede
- `get_network_users` - Lista usuários da rede (subordinados)
- `create_user` - Cria novo usuário de rede
- `update_user` - Atualiza usuário existente
- `delete_user` - Remove usuário (com validações)

### Gestão de Investidores
- `get_investors` - Lista investidores sob responsabilidade
- Criação de investidores via `create_user` com `role_name: 'Investidor'`

### Utilidades
- `get_possible_superiors` - Lista possíveis superiores para um role
- `get_available_roles` - Papéis que o usuário pode criar
- `get_profile` - Perfil completo do usuário atual

## Hierarquia Flexível

- **Global**: Nível superior, sem superior
- **Master**: Pode estar sob Global
- **Escritório**: Pode estar sob Global ou Master
- **Assessor**: Pode estar sob Global, Master ou Escritório
- **Investidor**: Não hierárquico, vinculado a advisor responsável

## Validações

1. **Nome da Empresa**: Obrigatório para usuários de rede
2. **Hierarquia**: Validada automaticamente via trigger
3. **Permissões**: Usuário só pode gerenciar subordinados diretos
4. **Exclusão**: Não permite deletar usuário com subordinados
