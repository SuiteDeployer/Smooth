# Smooth Platform

Sistema de gestão financeira com funcionalidades de investimentos, comissões e remuneração.

## 🚀 Deploy Automático

Este projeto está configurado para deploy automático com URL fixa.

### Plataformas Recomendadas:
- **Vercel** (recomendado): Ideal para React/Vite
- **Netlify**: Alternativa robusta
- **GitHub Pages**: Opção gratuita

## ⚙️ Configuração

### 1. Variáveis de Ambiente
Copie `.env.example` para `.env` e configure:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Instalação
```bash
pnpm install
```

### 3. Desenvolvimento
```bash
pnpm dev
```

### 4. Build
```bash
pnpm build
```

## 🔧 Deploy no Vercel

1. Conecte este repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

URL fixa: `https://smooth-platform.vercel.app`

## 🔧 Deploy no Netlify

1. Conecte este repositório ao Netlify  
2. Configure as variáveis de ambiente
3. Build command: `pnpm build`
4. Publish directory: `dist`

URL fixa: `https://smooth-platform.netlify.app`

## 📱 Funcionalidades

- ✅ Sistema de autenticação
- ✅ Dashboard de investimentos
- ✅ Gestão de comissões
- ✅ Sistema de remuneração
- ✅ Hierarquia de usuários
- ✅ Políticas RLS (Row Level Security)

## 👥 Contas de Demonstração

- **Global**: admin@smooth.com.br
- **Master**: master@smooth.com.br  
- **Escritório**: escritorio@smooth.com.br
- **Assessor**: assessor@smooth.com.br
- **Investidor**: investidor@smooth.com.br

**Senha**: smooth123

## 🏗️ Tecnologias

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- React Router DOM
- React Hook Form
- Zod
- React Query

## 📄 Estrutura

```
src/
├── components/     # Componentes reutilizáveis
├── features/       # Funcionalidades por módulo
├── hooks/          # Custom hooks
├── lib/           # Configurações e utilitários
├── pages/         # Páginas da aplicação
└── types/         # Definições de tipos
```

## 🔐 Backend (Supabase)

- **Banco**: PostgreSQL com RLS
- **Auth**: Sistema de autenticação
- **Storage**: Armazenamento de arquivos
- **Edge Functions**: Lógica serverless
