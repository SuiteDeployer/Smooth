# Análise da Arquitetura do Projeto Smooth Debenture

Este documento detalha a arquitetura e os fluxos de trabalho do projeto Smooth Debenture, conforme solicitado. A análise foi realizada com base no código-fonte do repositório GitHub e nas configurações do Supabase.



## 1. Debêntures

### Arquivos Envolvidos

- **`src/components/Dashboard/DebentureManagement.tsx`**: Componente React principal para a gestão de debêntures e séries. Contém a interface de usuário para criar, editar e visualizar debêntures.
- **`supabase/tables/debentures.sql`**: Script SQL que define a estrutura da tabela `debentures` no banco de dados Supabase.

### Funções Principais

- **`handleCreateDebenture`** (em `DebentureManagement.tsx`): Função assíncrona que lida com o envio do formulário de criação de uma nova debênture. Ela coleta os dados do formulário, insere um novo registro na tabela `debentures` do Supabase e atualiza a interface do usuário.

### Fluxo Resumido da Lógica

1.  O usuário (normalmente um administrador com as permissões adequadas) preenche o formulário de criação de debêntures na interface do `DebentureManagement`.
2.  Ao submeter o formulário, a função `handleCreateDebenture` é acionada.
3.  A função obtém o ID do usuário autenticado a partir do Supabase Auth.
4.  Um novo registro é inserido na tabela `debentures` com os dados do formulário, o status inicial como 'active' e o `created_by` definido com o ID do usuário.
5.  Após a inserção bem-sucedida, a lista de debêntures na interface é atualizada para refletir a nova adição.

## 2. Séries

### Arquivos Envolvidos

- **`src/components/Dashboard/DebentureManagement.tsx`**: O mesmo componente de gestão de debêntures também é responsável pela criação e gestão de séries associadas a uma debênture.
- **`supabase/tables/series.sql`**: Script SQL que define a estrutura da tabela `series`.
- **`src/components/Dashboard/Investment/InvestmentForm.tsx`**: Formulário de criação de investimentos que utiliza a informação da comissão máxima da série.

### Funções Principais

- **`handleCreateSeries`** (em `DebentureManagement.tsx`): Função que processa a criação de uma nova série para uma debênture existente. Ela valida os dados e os insere na tabela `series`.

### Como é Definida a Comissão Máxima na Série

A comissão máxima é definida diretamente no momento da criação da série. O campo `max_commission_percentage` na tabela `series` armazena esse valor.

- No formulário de criação de série dentro do `DebentureManagement.tsx`, existe um campo para o usuário inserir a "Comissão Máxima (%)".
- O valor padrão para este campo é `5.0`.
- Quando um investimento é criado através do `InvestmentForm.tsx`, a soma das comissões distribuídas entre Master, Escritório e Assessor é validada para não exceder o `max_commission_percentage` da série selecionada.

### Fluxo Resumido da Lógica

1.  O usuário seleciona uma debênture existente e abre o formulário para criar uma nova série.
2.  No formulário, ele preenche os detalhes da série, incluindo o `max_commission_percentage`.
3.  A função `handleCreateSeries` é chamada na submissão, inserindo um novo registro na tabela `series` com a `debenture_id` correspondente.
4.  Posteriormente, ao criar um investimento para essa série, o sistema carrega o valor de `max_commission_percentage` e o utiliza como teto para a distribuição de comissões.



## 3. Comissionamento

### Arquivos Envolvidos

- **`supabase/migrations/1754328459_create_commission_calculation_functions.sql`**: Script de migração do Supabase que cria a função `calculate_investment_commissions_new()`, responsável por calcular e distribuir as comissões.
- **`supabase/tables/commissions.sql`**: Define a tabela `commissions` onde os registros de comissão são armazenados.
- **`supabase/tables/commission_schedules.sql`** e **`supabase/tables/commission_payments.sql`**: Tabelas que controlam o cronograma de pagamento mensal das comissões.
- **`src/components/Dashboard/Investment/InvestmentForm.tsx`**: Onde as porcentagens de comissão para cada nível hierárquico são inseridas manualmente durante a criação do investimento.

### Funções Principais

- **`calculate_investment_commissions_new()`** (Função de Trigger no PostgreSQL): Esta função é o coração da lógica de comissionamento. Ela é acionada sempre que um novo registro é inserido na tabela `investments`.

### Como a Comissão é Dividida entre Master, Escritório e Assessor

A divisão da comissão é realizada de forma automática pela função `calculate_investment_commissions_new()` no banco de dados, seguindo uma lógica hierárquica.

1.  **Gatilho**: A criação de um novo investimento na tabela `investments` dispara a função.
2.  **Busca Hierárquica**: A função inicia uma busca recursiva (CTE - Common Table Expression) na tabela `users`, começando pelo `assessor_user_id` associado ao investimento e subindo na hierarquia através do campo `superior_user_id`. A recursão sobe até 3 níveis, cobrindo a hierarquia Assessor -> Escritório -> Master.
3.  **Cálculo por Nível**: Para cada nível da hierarquia encontrado (Assessor, Escritório, Master), a função realiza o seguinte:
    *   **Busca do Perfil de Comissão**: Ela procura por um perfil de comissão específico para a série e o papel (`role_name`) na tabela `commission_profiles`. 
    *   **Valores Padrão**: Se nenhum perfil específico for encontrado, a função utiliza valores padrão de porcentagem: 1.00% para Assessor, 0.40% para Escritório e 0.20% para Master.
    *   **Cálculo do Valor**: O valor total da comissão para aquele nível é calculado como `invested_amount * (percentage / 100)`.
4.  **Geração do Cronograma**: O valor total da comissão é dividido pela duração da série (`duration_months`) para obter o valor mensal (`v_monthly_amount`).
5.  **Inserção de Registros**: Para cada mês da duração da série, a função insere registros nas tabelas `commission_schedules` (o cronograma) e `commission_payments` (o controle de pagamento), detalhando o valor a ser pago, o destinatário e a data.

### Fluxo Resumido da Lógica

1.  Um usuário (Master, Escritório ou Assessor) cria um novo investimento através do `InvestmentForm.tsx`.
2.  No formulário, ele especifica as porcentagens de comissão para cada nível (Master, Escritório, Assessor), cuja soma não pode ultrapassar a `max_commission_percentage` da série.
3.  A função `createInvestment` no hook `useAdminInvestments.ts` insere o novo investimento na tabela `investments`.
4.  O gatilho no banco de dados aciona a função `calculate_investment_commissions_new()`.
5.  A função percorre a hierarquia do assessor, calcula a comissão para cada nível superior (Escritório, Master) e para o próprio Assessor, e gera o cronograma de pagamentos mensais nas tabelas `commission_schedules` e `commission_payments`.



## 4. Investimentos

### Arquivos Envolvidos

- **`src/components/Dashboard/InvestmentDashboard.tsx`**: Componente React que serve como painel principal para a visualização e criação de investimentos.
- **`src/components/Dashboard/Investment/InvestmentForm.tsx`**: Formulário utilizado para a criação de novos investimentos.
- **`src/hooks/useAdminInvestments.ts`**: Hook React que encapsula a lógica de negócios para buscar, criar e deletar investimentos, interagindo com o Supabase.
- **`supabase/tables/investments.sql`**: Script de definição da tabela `investments`.

### Funções Principais

- **`createInvestment`** (em `useAdminInvestments.ts`): Função que recebe os dados do formulário de investimento e os insere na tabela `investments`.
- **`InvestmentDashboard`** (Componente React): Renderiza a lista de investimentos e fornece o botão para abrir o formulário de criação (`InvestmentForm`).

### Quais Papéis Podem Criar Investimentos

O sistema permite que usuários com os papéis de **Master**, **Escritório** e **Assessor** criem investimentos. Isso é controlado no frontend pela disponibilidade do `InvestmentDashboard` e do formulário de criação para esses perfis de usuário.

- O `InvestmentDashboard` é o ponto central para a gestão de investimentos.
- Dentro deste dashboard, um botão "Novo Investimento" (controlado pelo estado `showCreateForm`) abre o `InvestmentForm`.
- A lógica de acesso a este dashboard, embora não explicitamente detalhada em um único local, é distribuída entre os dashboards específicos de cada papel (`MasterDashboard`, `EscritorioDashboard`, `AssessorDashboard`), que por sua vez podem conter ou linkar para o `InvestmentDashboard`.

### Como a Comissão é Propagada

A propagação da comissão é um processo totalmente automatizado no backend (banco de dados) e não requer intervenção manual após a criação do investimento.

1.  **Entrada de Dados**: No `InvestmentForm.tsx`, o usuário que cria o investimento define as porcentagens de comissão para o Assessor, o Escritório e o Master. A soma dessas porcentagens é validada em relação à `max_commission_percentage` da série.
2.  **Criação do Investimento**: A função `createInvestment` no hook `useAdminInvestments.ts` é chamada, inserindo um novo registro na tabela `investments` com os dados fornecidos.
3.  **Acionamento do Gatilho**: A inserção na tabela `investments` aciona o gatilho que executa a função `calculate_investment_commissions_new()` no PostgreSQL.
4.  **Cálculo e Distribuição**: Conforme detalhado na seção de Comissionamento, esta função calcula o valor da comissão para cada membro da hierarquia (Assessor, Escritório, Master) com base nas porcentagens definidas no investimento e gera o cronograma de pagamentos mensais.

### Fluxo Resumido da Lógica

1.  Um usuário com permissão (Master, Escritório ou Assessor) acessa o `InvestmentDashboard`.
2.  Ele clica para criar um novo investimento, abrindo o `InvestmentForm`.
3.  Ele preenche os detalhes do investimento, incluindo o investidor, o assessor, a série, o valor e as porcentagens de comissão para cada nível da hierarquia.
4.  Após a submissão, a função `createInvestment` é executada, salvando o investimento no banco de dados.
5.  O gatilho do banco de dados assume e propaga as comissões automaticamente, criando os registros necessários nas tabelas `commission_schedules` e `commission_payments`.



## 5. RLS (Row Level Security)

### Arquivos Envolvidos

- **`supabase/migrations/*_rls_*.sql`**: Diversos arquivos de migração do Supabase que definem e ajustam as políticas de RLS para as tabelas do banco de dados. Os mais relevantes são:
    - `1757097372_add_hierarchy_gradually.sql`: Define a política de visualização hierárquica para a tabela `users`.
    - `1757021107_fix_investments_rls_hierarchical_policy.sql`: Define as políticas de SELECT, INSERT, UPDATE e DELETE para a tabela `investments`.
    - `1757021121_fix_commissions_rls_hierarchical_policy.sql`: Define as políticas para a tabela `commissions`.

### Estrutura de Acesso

A segurança de acesso aos dados é garantida principalmente através de políticas de RLS no Supabase, que filtram os registros que cada usuário pode ver ou modificar com base em seu papel e posição na hierarquia.

### Como a RLS Garante a Visibilidade Hierárquica

A RLS está configurada para garantir que um usuário em um nível superior da hierarquia possa ver todos os dados dos usuários que estão abaixo dele, mas não o contrário.

1.  **Hierarquia Definida pelo `superior_user_id`**: A relação hierárquica é estabelecida na tabela `users` através do campo `superior_user_id`, que aponta para o usuário imediatamente acima na cadeia.

2.  **Políticas Recursivas (CTE)**: As políticas de RLS para tabelas como `investments` e `commissions` utilizam consultas recursivas (Common Table Expressions - CTEs) para navegar na hierarquia. 
    - A política de SELECT na tabela `investments`, por exemplo, permite que um usuário veja um investimento se ele for o próprio investidor, o assessor, ou se o investidor ou o assessor estiverem em sua rede de subordinados.
    - A consulta recursiva `user_hierarchy` começa com os subordinados diretos do usuário autenticado e desce recursivamente por toda a sua rede.

3.  **Regras por Papel (`role_name`)**:
    - **Global**: Usuários com o papel 'Global' têm acesso irrestrito a todos os dados, pois as políticas de RLS contêm uma cláusula `OR` que verifica se o usuário tem esse papel.
    - **Master, Escritório, Assessor**: Esses usuários podem ver os dados de sua própria rede (subordinados) e os seus próprios dados.
    - **Investidor**: Pode ver apenas os seus próprios investimentos e dados relacionados.

4.  **Políticas de Modificação (INSERT, UPDATE, DELETE)**:
    - **INSERT**: Geralmente, a permissão para inserir dados (como criar um investimento) é concedida a papéis específicos como 'Global', 'Master', 'Escritório' e 'Assessor'.
    - **UPDATE/DELETE**: As permissões de atualização e exclusão são mais restritivas. Normalmente, apenas o 'Global' ou, em alguns casos, o proprietário do registro ou um superior hierárquico direto pode modificar ou excluir dados.

### Fluxo Resumido da Lógica

1.  Um usuário faz uma requisição à API do Supabase (por exemplo, para buscar uma lista de investimentos).
2.  O Supabase identifica o usuário autenticado através de seu token JWT.
3.  Antes de executar a consulta no banco de dados, o Supabase aplica as políticas de RLS definidas para a tabela `investments`.
4.  A política de SELECT é avaliada no contexto do `auth.uid()` do usuário. A consulta recursiva é executada para determinar todos os IDs de usuário na sua hierarquia subordinada.
5.  A consulta final retorna apenas os registros de investimentos que correspondem aos critérios da política (ou seja, investimentos pertencentes ao usuário ou à sua rede).
6.  O resultado é uma lista de investimentos filtrada e segura, garantindo que o usuário veja apenas o que lhe é permitido.



## 6. Conclusão e Pontos de Atenção

A arquitetura do projeto Smooth Debenture está bem estruturada, com uma clara separação de responsabilidades entre o frontend em React e o backend no Supabase. A lógica de negócios mais complexa, como o cálculo de comissões e a segurança de dados, está centralizada no banco de dados através de funções e políticas de RLS, o que é uma boa prática.

### Pontos de Atenção Identificados:

- **Complexidade das Políticas RLS**: As políticas de RLS que utilizam CTEs recursivas são poderosas, mas podem se tornar um ponto de complexidade e difícil depuração, como evidenciado pelos vários arquivos de migração para corrigir problemas de recursão (`fix_infinite_recursion_rls_policies`, etc.). Qualquer alteração na estrutura hierárquica deve ser testada exaustivamente para evitar problemas de performance ou segurança.
- **Lógica de Comissão Fixa como Fallback**: A função `calculate_investment_commissions_new` utiliza valores de comissão fixos como fallback caso não encontre um perfil de comissão específico. Isso pode levar a cálculos inesperados se os perfis não forem configurados corretamente para todas as séries e papéis.
- **Gerenciamento de Estado no Frontend**: O uso de múltiplos `useState` em componentes grandes como o `DebentureManagement.tsx` pode ser refatorado para usar um `useReducer` para um gerenciamento de estado mais centralizado e previsível, especialmente à medida que novas funcionalidades forem adicionadas.

Esta análise inicial fornece uma base sólida para futuras modificações e desenvolvimentos no projeto. A próxima fase deve se concentrar em validar este entendimento com a equipe e, em seguida, proceder com as modificações autorizadas.


