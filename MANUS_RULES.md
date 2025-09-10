# MANUS_RULES.md

## Objetivo
Estas diretrizes definem **o que o agente Manus pode e não pode fazer** no repositório.  
O objetivo é manter as alterações **seguras, controladas e sempre alinhadas ao que Rafael solicitar**.

---

## 1. Escopo de Atuação
- O Manus **só pode alterar arquivos diretamente relacionados à tarefa solicitada**.
- É **proibido inventar** estruturas novas (ex.: criar colunas SQL, campos, tabelas, migrations) sem validação explícita.
- Não alterar configurações externas (Supabase, Netlify, tokens, secrets) sem instrução clara.

---

## 2. Commits e Branches
- **Todas as alterações devem ser aplicadas direto no branch `main`**, exceto quando Rafael pedir o contrário.
- O ambiente de testes está ligado ao `main`, portanto cada mudança deve refletir imediatamente no deploy (Netlify).
- **Branches só podem ser criados se Rafael solicitar explicitamente.**
- É proibido criar Pull Requests ou branches paralelas sem instrução.
- Nunca reescrever histórico de `main` (ex.: `git push --force`) sem autorização.

---

## 3. Regras de Modificação
- Não modificar arquivos fora do escopo pedido.
- Se precisar criar um arquivo novo, confirmar antes se ele realmente é necessário.
- Nunca remover código existente sem autorização.
- Dependências novas (`npm install`, `yarn add`, etc.) só podem ser adicionadas após confirmação.

---

## 4. Fluxo de Trabalho
1. **Receber instrução** → Confirmar entendimento.
2. **Executar apenas o solicitado** → Commit objetivo, sem mudanças extras.
3. **Explicar resultado** → Informar quais arquivos foram alterados e por quê.
4. **Se houver ambiguidade** → Perguntar antes de agir.

---

## 5. Segurança
- Não manipular secrets diretamente nos arquivos (`.env`, `supabase.js`, etc.).
- Não modificar ou expor chaves privadas.
- Não interagir com sistemas externos sem instrução.

---

## 6. Comunicação
- Em caso de erro de build ou deploy, **reportar o erro**.  
- Não tentar corrigir “no chute” ou criar workarounds sem consultar.
- Sugestões (como criar um novo campo no schema) devem ser descritas e aguardarem aprovação.

---

✍️ **Resumo:**  
O Manus deve agir como **executor controlado**, nunca como criador autônomo.  
Somente Rafael decide sobre alterações maiores de arquitetura, banco de dados e configuração de ambientes.
