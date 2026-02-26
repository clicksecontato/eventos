# 📦 Guia de Migração: Firebase → Supabase

Este guia explica como migrar todos os dados do Firebase Firestore para o Supabase.

## 📋 Pré-requisitos

1. ✅ Schema do Supabase executado (`schema.sql`)
2. ✅ Migração de tipos executada (`migrate-user-id-to-varchar.sql`)
3. ✅ Variáveis de ambiente configuradas no `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `GOOGLE_CREDENTIALS_CLIENT_EMAIL`
   - `GOOGLE_CREDENTIALS_PRIVATE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 🔧 Instalação de Dependências

O script precisa do `tsx` para executar TypeScript:

```bash
npm install --save-dev tsx
```

Ou use `ts-node`:

```bash
npm install --save-dev ts-node typescript
```

## 🚀 Executando a Migração

### Opção 1: Usando tsx (recomendado)

```bash
npx tsx supabase/migrate-firebase-to-supabase.ts
```

### Opção 2: Adicionar script no package.json

Adicione ao `package.json`:

```json
{
  "scripts": {
    "migrate:firebase-to-supabase": "tsx supabase/migrate-firebase-to-supabase.ts"
  }
}
```

Depois execute:

```bash
npm run migrate:firebase-to-supabase
```

### Opção 3: Compilar e executar

```bash
# Compilar
npx tsc supabase/migrate-firebase-to-supabase.ts --outDir dist --esModuleInterop

# Executar
node dist/migrate-firebase-to-supabase.js
```

## 📊 O que é migrado?

O script migra os seguintes dados na ordem correta (respeitando dependências):

1. **Usuários** (`controle_users` → `users`)
2. **Tipos** (tipo_eventos, tipo_custos, tipo_servicos, canais_entrada)
3. **Clientes** (subcollection de usuários → `clientes`)
4. **Eventos** (subcollection de usuários → `eventos`)
5. **Pagamentos** (collection global → `pagamentos`)
6. **Custos** (collection global → `custos`)
7. **Serviços** (collection global → `servicos_evento`)

## ⚙️ Como funciona?

- **Upsert**: Usa `upsert` para evitar duplicatas (pode executar múltiplas vezes)
- **Conversão automática**: Converte Timestamps do Firestore para ISO strings
- **Preservação de IDs**: Mantém os mesmos IDs do Firestore
- **Tratamento de erros**: Continua mesmo se houver erros em alguns registros
- **Estatísticas**: Mostra progresso e estatísticas ao final

## 🔍 Verificando a Migração

Após executar, verifique no Supabase Dashboard:

1. Vá em **Table Editor**
2. Verifique as tabelas:
   - `users` - deve ter seus usuários
   - `clientes` - deve ter seus clientes
   - `eventos` - deve ter seus eventos
   - etc.

## ⚠️ Importante

- **Backup**: Faça backup do Supabase antes de executar (se já tiver dados)
- **Teste primeiro**: Execute em ambiente de desenvolvimento primeiro
- **Validação**: Verifique alguns registros manualmente após a migração
- **Dados duplicados**: O script usa `upsert`, então pode executar múltiplas vezes sem duplicar

## 🐛 Troubleshooting

### Erro: "Variáveis do Firebase Admin não configuradas"

Verifique se você tem no `.env.local`:
- `GOOGLE_CREDENTIALS_CLIENT_EMAIL`
- `GOOGLE_CREDENTIALS_PRIVATE_KEY`

Para obter essas credenciais:
1. Firebase Console → Project Settings → Service Accounts
2. Generate New Private Key
3. Copie `client_email` para `GOOGLE_CREDENTIALS_CLIENT_EMAIL` e `private_key` para `GOOGLE_CREDENTIALS_PRIVATE_KEY`

### Erro: "Variáveis do Supabase não configuradas"

Verifique se você tem no `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Erro: "invalid input syntax for type uuid"

Execute o script de migração de schema primeiro:
```sql
-- Execute migrate-user-id-to-varchar.sql no Supabase
```

### Erro: Foreign key constraint

Certifique-se de que:
1. Usuários foram migrados primeiro
2. Tipos foram migrados antes de eventos/clientes
3. Clientes foram migrados antes de eventos

## 📝 Notas

- O script é **idempotente**: pode executar múltiplas vezes
- **Performance**: Para grandes volumes, pode demorar. O script mostra progresso
- **Limitações**: Alguns campos podem precisar de ajuste manual após a migração

## 🔄 Re-executar Migração

Se precisar re-executar:

```bash
# O script usa upsert, então é seguro executar novamente
npm run migrate:firebase-to-supabase
```

Isso atualizará registros existentes e adicionará novos.

