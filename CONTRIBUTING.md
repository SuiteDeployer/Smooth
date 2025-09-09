# Guia de Contribuição

Obrigado por considerar contribuir com o Smooth Platform! 

## 🚀 Como Contribuir

### 1. Fork o Projeto
```bash
git clone https://github.com/SuiteDeployer/Smooth.git
cd Smooth
```

### 2. Configurar o Ambiente
```bash
# Instalar dependências
pnpm install

# Copiar arquivo de ambiente
cp .env.example .env
# Editar .env com suas credenciais do Supabase
```

### 3. Criar Branch
```bash
git checkout -b feature/nova-funcionalidade
# ou
git checkout -b fix/correcao-bug
```

### 4. Desenvolvimento
- Siga os padrões de código estabelecidos
- Mantenha commits pequenos e com mensagens descritivas
- Teste suas mudanças localmente

### 5. Commit
```bash
git add .
git commit -m "feat: adiciona nova funcionalidade X"
# ou
git commit -m "fix: corrige problema Y"
```

### 6. Push e Pull Request
```bash
git push origin feature/nova-funcionalidade
```
Então abra um Pull Request no GitHub.

## 📝 Padrões de Commit

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `style:` formatação
- `refactor:` refatoração
- `test:` testes
- `chore:` tarefas gerais

## 🧪 Testes

Antes de submeter um PR, certifique-se de que:

```bash
# Build funciona
pnpm build

# Lint passa
pnpm lint

# Testes passam (quando implementados)
pnpm test
```

## 📞 Suporte

Se precisar de ajuda, abra uma issue ou entre em contato.
