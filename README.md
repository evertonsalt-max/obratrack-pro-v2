# ObraTrack Pro v2 — Next.js + Supabase

Sistema profissional de gestão de obras com dados 100% na nuvem.

---

## PASSO A PASSO — Do zero ao ar em 1 hora

### ETAPA 1 — Configurar o Supabase (banco de dados na nuvem)

1. Acesse **supabase.com** e crie uma conta gratuita
2. Clique em **"New Project"**
   - Nome: `obratrack`
   - Região: **South America (São Paulo)**
   - Crie uma senha forte para o banco
   - Clique em **"Create new project"** (aguarde ~2 min)

3. Criar as tabelas:
   - No menu lateral, clique em **"SQL Editor"**
   - Clique em **"New query"**
   - Copie todo o conteúdo do arquivo `supabase-schema.sql`
   - Cole no editor e clique em **"Run"**
   - Deve aparecer "Success" para cada comando

4. Ativar login com Google (opcional):
   - Vá em **Authentication → Providers → Google**
   - Ative o toggle
   - Preencha Client ID e Secret do Google Cloud Console
   - URL de callback: `https://SEU_PROJETO.supabase.co/auth/v1/callback`

5. Pegar as chaves da API:
   - Vá em **Settings → API**
   - Copie: **Project URL** e **anon public key**

---

### ETAPA 2 — Configurar o projeto localmente

```bash
# Clonar ou criar o projeto
cd obratrack-pro

# Instalar dependências
npm install

# Criar arquivo de variáveis
cp .env.example .env.local
```

Edite o `.env.local` com suas chaves do Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

### ETAPA 3 — Testar localmente

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

### ETAPA 4 — Publicar na Vercel

1. Suba o projeto para o GitHub:
```bash
git init
git add .
git commit -m "ObraTrack Pro v2"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/obratrack-pro.git
git push -u origin main
```

2. Acesse **vercel.com** → importe o repositório `obratrack-pro`

3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` → sua URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → sua chave do Supabase
   - `NEXT_PUBLIC_SITE_URL` → `https://obratrackpro.com.br`

4. Clique em **Deploy**

5. Conecte seu domínio em **Settings → Domains**

---

### ETAPA 5 — Configurar login com Google (opcional)

1. Acesse **console.cloud.google.com**
2. Crie um projeto → **APIs → Credentials → OAuth 2.0 Client ID**
3. Origens autorizadas: `https://obratrackpro.com.br`
4. URI de redirecionamento: `https://SEU_PROJETO.supabase.co/auth/v1/callback`
5. Cole o Client ID e Secret no Supabase → Authentication → Google

---

## Estrutura de arquivos

```
obratrack-pro/
├── app/
│   ├── layout.tsx              ← Layout raiz
│   ├── page.tsx                ← Redireciona para /dashboard
│   ├── globals.css             ← Estilos globais
│   ├── login/page.tsx          ← Tela de login
│   ├── cadastro/page.tsx       ← Tela de cadastro
│   ├── recuperar-senha/page.tsx← Recuperação de senha
│   ├── auth/callback/route.ts  ← Callback OAuth
│   └── dashboard/
│       ├── layout.tsx          ← Layout com sidebar
│       ├── page.tsx            ← Dashboard principal
│       ├── funcionarios/       ← Gestão de funcionários
│       ├── horarios/           ← Registro de jornadas
│       ├── pagamentos/         ← Controle financeiro
│       ├── relatorios/         ← Relatórios e exportação
│       ├── audio/              ← Registro por áudio
│       ├── obras/              ← Cadastro de obras
│       └── importar/           ← Importação de planilhas
├── components/                 ← Componentes reutilizáveis
├── hooks/
│   ├── useAuth.ts              ← Hook de autenticação
│   └── useData.ts              ← Hooks de dados (Supabase)
├── lib/
│   ├── supabase.ts             ← Cliente browser
│   └── supabase-server.ts      ← Cliente servidor
├── types/index.ts              ← Tipos TypeScript
├── middleware.ts               ← Proteção de rotas
├── supabase-schema.sql         ← Schema completo do banco
├── .env.example                ← Modelo de variáveis
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Segurança implementada

- ✅ Row Level Security (RLS) — cada usuário vê só seus dados
- ✅ Middleware — rotas protegidas no servidor
- ✅ JWT gerenciado pelo Supabase
- ✅ Sessão persistente em múltiplos dispositivos
- ✅ Trigger automático para criar perfil ao cadastrar
- ✅ Logs de auditoria
- ✅ Preparado para multi-empresa (company_id em todas as tabelas)
