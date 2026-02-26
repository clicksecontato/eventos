# Variáveis de Ambiente - Supabase

## Variáveis Necessárias para Supabase

Adicione estas variáveis ao seu arquivo `.env` ou nas configurações do Vercel:

### Obrigatórias

```bash
# Supabase - Configuração Principal
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui

# Supabase - Service Role Key (apenas para operações server-side)
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Feature Flag - Ativar Supabase (opcional, padrão: false)
# Quando true, usa repositórios Supabase ao invés de Firebase
# IMPORTANTE: No Next.js, use NEXT_PUBLIC_ para funcionar no cliente
NEXT_PUBLIC_USE_SUPABASE=true

# Alternativa (apenas servidor): USE_SUPABASE=true
# USE_SUPABASE=true
```

### Onde encontrar essas informações:

1. **NEXT_PUBLIC_SUPABASE_URL**:
   - Acesse: https://app.supabase.com
   - Selecione seu projeto
   - Vá em **Settings** → **API**
   - Copie a **Project URL**

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**:
   - No mesmo lugar (Settings → API)
   - Copie a **anon/public** key
   - Esta chave é segura para usar no cliente (browser)

3. **SUPABASE_SERVICE_ROLE_KEY**:
   - No mesmo lugar (Settings → API)
   - Copie a **service_role** key
   - ⚠️ **IMPORTANTE**: Esta chave é SECRETA e só deve ser usada no servidor
   - ⚠️ **NUNCA** exponha esta chave no código do cliente

### Exemplo de arquivo .env.local:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.exemplo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.exemplo
```

## Variáveis Opcionais (se ainda usar Firebase para outras coisas)

Se você ainda usar Firebase para autenticação ou outras funcionalidades:

```bash
# Firebase (opcional - apenas se ainda usar)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Variáveis Existentes (manter)

Mantenha estas variáveis que já estão em uso:

```bash
# AWS S3 (para arquivos)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...

# NextAuth
NEXTAUTH_URL=...
NEXTAUTH_SECRET=...

# Outras configurações
# ...
```

## Configuração no Vercel

1. Acesse seu projeto no Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione as 3 variáveis do Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Selecione os ambientes (Production, Preview, Development)
5. Clique em **Save**

## Segurança

- ✅ **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Pode ser exposta (é pública)
- ❌ **SUPABASE_SERVICE_ROLE_KEY**: NUNCA exponha no cliente, apenas no servidor
- Use RLS (Row Level Security) no Supabase para garantir que usuários só acessem seus próprios dados

