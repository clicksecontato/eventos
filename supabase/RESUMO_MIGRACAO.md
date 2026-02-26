# Resumo da Migração para Supabase

## ✅ O que foi criado

### 1. Schema SQL Completo
- **Arquivo**: `supabase/schema.sql`
- **Conteúdo**: Todas as tabelas, índices, triggers e políticas RLS
- **Status**: Pronto para executar no Supabase

### 2. Documentação
- **Arquivo**: `supabase/README.md` - Guia completo de migração
- **Arquivo**: `supabase/VARIAVEIS_AMBIENTE.md` - Variáveis de ambiente necessárias

### 3. Estrutura de Código
- **Arquivo**: `src/lib/supabase/client.ts` - Cliente Supabase
- **Arquivo**: `src/lib/supabase/types.ts` - Tipos TypeScript
- **Arquivo**: `src/lib/repositories/supabase/base-supabase-repository.ts` - Base repository

---

## 🔑 Variáveis de Ambiente Necessárias

Você precisa adicionar estas **3 variáveis** ao seu `.env` ou Vercel:

```bash
# Obrigatórias
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
```

### Onde encontrar:

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (SECRETA)

---

## 📦 Instalação

Execute no terminal:

```bash
npm install @supabase/supabase-js
```

---

## 🚀 Próximos Passos

### 1. Criar Projeto no Supabase
- Acesse https://app.supabase.com
- Crie um novo projeto
- Anote as credenciais

### 2. Executar Schema
- No Supabase Dashboard, vá em **SQL Editor**
- Cole o conteúdo de `supabase/schema.sql`
- Execute o script

### 3. Configurar Variáveis
- Adicione as 3 variáveis ao `.env.local`
- Configure no Vercel também

### 4. Instalar Dependência
```bash
npm install @supabase/supabase-js
```

### 5. Atualizar RepositoryFactory ✅
- ✅ `RepositoryFactory` atualizado com suporte a Supabase
- ✅ Feature flag `USE_SUPABASE` para alternar entre Firebase e Supabase
- ✅ Repositórios Supabase já criados e prontos

**Para ativar Supabase:**
Adicione ao `.env.local`:
```bash
NEXT_PUBLIC_USE_SUPABASE=true
```

**⚠️ IMPORTANTE**: No Next.js, variáveis de ambiente precisam ter o prefixo `NEXT_PUBLIC_` para funcionar no cliente (browser). Use `NEXT_PUBLIC_USE_SUPABASE` ao invés de `USE_SUPABASE`.

### 6. Próximas Implementações
- ⏳ Criar script de migração de dados (Firebase → Supabase)
- ⏳ Testar repositórios Supabase
- ⏳ Configurar políticas RLS no Supabase

---

## 📊 Estrutura do Schema

O schema inclui:

- ✅ **users** - Usuários do sistema
- ✅ **clientes** - Clientes
- ✅ **eventos** - Eventos
- ✅ **pagamentos** - Pagamentos
- ✅ **custos** - Custos
- ✅ **servicos_evento** - Serviços
- ✅ **canais_entrada** - Canais de entrada
- ✅ **tipo_eventos** - Tipos de evento
- ✅ **tipo_custos** - Tipos de custo
- ✅ **tipo_servicos** - Tipos de serviço
- ✅ **contratos** - Contratos
- ✅ **modelos_contrato** - Modelos de contrato
- ✅ **configuracao_contrato** - Configurações
- ✅ **relatorios_diarios** - Cache de relatórios
- ✅ **relatorios_cache** - Snapshots
- ✅ **google_calendar_tokens** - Tokens Google Calendar
- ✅ **anexos_eventos** - Anexos
- ✅ **anexos_pagamento** - Anexos de pagamento

**Total**: 18 tabelas principais + índices + triggers + RLS

---

## 🔒 Segurança

- ✅ Row Level Security (RLS) habilitado em todas as tabelas
- ✅ Políticas RLS serão configuradas para isolar dados por usuário
- ✅ Service Role Key apenas no servidor (nunca no cliente)

---

## 📝 Notas Importantes

1. **Compatibilidade**: Os repositórios Supabase mantêm a mesma interface dos repositórios Firebase
2. **Conversão**: Conversão automática entre camelCase (app) e snake_case (DB)
3. **Migração**: Script de migração será criado na próxima etapa
4. **Feature Flag**: Migração pode ser feita gradualmente com feature flag

---

## ❓ Dúvidas?

Consulte:
- `supabase/README.md` - Guia completo
- `supabase/VARIAVEIS_AMBIENTE.md` - Detalhes das variáveis
- Documentação Supabase: https://supabase.com/docs

