# ANÁLISE DAS TABELAS PARA ÁREAS MANUS

## OBJETIVO
Documentar estrutura das tabelas `commissions` e `remuneracoes` para implementação das novas áreas "Comissões Manus" e "Remuneração Manus".

## TABELA COMMISSIONS

### Estrutura
```sql
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL,
    hierarchy_tracking_id UUID NOT NULL,
    recipient_user_id UUID NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(15,2) NOT NULL,
    commission_type VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Campos Relevantes para Comissões Manus
- **id**: Identificador único da comissão
- **investment_id**: Referência ao investimento que gerou a comissão
- **recipient_user_id**: ID do usuário que recebe a comissão (Master/Escritório/Assessor)
- **commission_percentage**: Percentual da comissão
- **commission_amount**: Valor monetário da comissão
- **commission_type**: Tipo da comissão
- **payment_status**: Status do pagamento (pending, paid, etc.)
- **paid_at**: Data do pagamento
- **created_at**: Data de criação

### Relacionamentos Identificados
- **investment_id** → `investments.id` (investimento que originou a comissão)
- **recipient_user_id** → `users.id` (usuário que recebe a comissão)
- **hierarchy_tracking_id** → `hierarchy_tracking.id` (controle hierárquico)

## TABELA REMUNERACOES

### Estrutura
```sql
CREATE TABLE remuneracoes (
    id_pagamento VARCHAR(255) PRIMARY KEY,
    nome_investidor TEXT NOT NULL,
    debenture TEXT NOT NULL,
    serie TEXT NOT NULL,
    valor_remuneracao DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    pix TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID NOT NULL
);
```

### Campos Relevantes para Remuneração Manus
- **id_pagamento**: Identificador único do pagamento
- **nome_investidor**: Nome do investidor que recebe a remuneração
- **debenture**: Nome da debênture
- **serie**: Nome da série
- **valor_remuneracao**: Valor monetário da remuneração
- **status**: Status do pagamento (PENDENTE, PAGO, etc.)
- **data_vencimento**: Data de vencimento da remuneração
- **data_pagamento**: Data efetiva do pagamento
- **pix**: Chave PIX para pagamento
- **user_id**: ID do usuário investidor
- **created_at**: Data de criação
- **updated_at**: Data de atualização

### Relacionamentos Identificados
- **user_id** → `users.id` (usuário investidor que recebe a remuneração)

## TABELAS RELACIONADAS

### INVESTMENTS
```sql
CREATE TABLE investments (
    id UUID PRIMARY KEY,
    series_id UUID NOT NULL,
    investor_user_id UUID NOT NULL,
    assessor_user_id UUID NOT NULL,
    invested_amount DECIMAL(15,2) NOT NULL,
    investment_date DATE NOT NULL,
    ...
);
```

**Relacionamentos**:
- **investor_user_id** → `users.id` (investidor)
- **assessor_user_id** → `users.id` (assessor que criou o investimento)

### USERS
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL,
    superior_user_id UUID,
    ...
);
```

**Relacionamentos**:
- **superior_user_id** → `users.id` (hierarquia)
- **role_id** → `user_roles.id` (papel do usuário)

## LÓGICA DE NEGÓCIO IDENTIFICADA

### COMISSÕES
- **Quem recebe**: Master, Escritório, Assessor (recipient_user_id)
- **Origem**: Investimentos criados (investment_id)
- **Hierarquia**: Controlada via hierarchy_tracking_id
- **Valores**: commission_percentage e commission_amount

### REMUNERAÇÕES
- **Quem recebe**: Investidores (user_id)
- **Origem**: Investimentos em debêntures/séries
- **Valores**: valor_remuneracao
- **Cronograma**: data_vencimento e data_pagamento

## CAMPOS NECESSÁRIOS PARA EXIBIÇÃO

### COMISSÕES MANUS
**Campos Principais**:
- Nome do usuário (JOIN com users.full_name)
- Papel do usuário (JOIN com user_roles)
- Valor da comissão (commission_amount)
- Percentual (commission_percentage)
- Status do pagamento (payment_status)
- Data de criação (created_at)
- Data de pagamento (paid_at)

**Campos Adicionais**:
- Investimento relacionado (JOIN com investments)
- Série/Debênture (JOIN via investments → series)

### REMUNERAÇÃO MANUS
**Campos Principais**:
- Nome do investidor (nome_investidor)
- Debênture (debenture)
- Série (serie)
- Valor da remuneração (valor_remuneracao)
- Status (status)
- Data de vencimento (data_vencimento)
- Data de pagamento (data_pagamento)

**Campos Adicionais**:
- PIX (pix)
- ID do usuário (user_id)

## CONSULTAS NECESSÁRIAS

### Para RLS Hierárquico
Ambas as tabelas precisarão de consultas que:
1. Identifiquem a hierarquia do usuário logado
2. Filtrem dados baseado na rede hierárquica
3. Respeitem os papéis (Global vê tudo, Master vê sua rede, etc.)

### JOINs Necessários
- **commissions** ← users (recipient_user_id)
- **commissions** ← investments (investment_id)
- **remuneracoes** ← users (user_id)
- **users** ← user_roles (role_id)

## PRÓXIMOS PASSOS
1. Analisar políticas RLS funcionais existentes
2. Criar template de política hierárquica
3. Planejar estrutura frontend baseada nestes campos

