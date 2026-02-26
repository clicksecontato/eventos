# Migração para Supabase - Guia Completo

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Inicial](#configuração-inicial)
3. [Instalação](#instalação)
4. [Criação do Schema](#criação-do-schema)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Migração de Dados](#migração-de-dados)
7. [Estrutura de Repositórios](#estrutura-de-repositórios)

---

## Pré-requisitos

- Conta no Supabase (https://supabase.com)
- Projeto criado no Supabase
- Node.js 18+ instalado
- Acesso ao projeto Firebase atual (para migração de dados)

---

## Configuração Inicial

### 1. Criar Projeto no Supabase

1. Acesse https://app.supabase.com
2. Clique em **New Project**
3. Preencha:
   - **Name**: click-se-sistema (ou seu nome preferido)
   - **Database Password**: (anote esta senha!)
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
4. Aguarde a criação do projeto (2-3 minutos)

### 2. Obter Credenciais

1. No projeto criado, vá em **Settings** → **API**
2. Anote:
   - **Project URL** (ex: `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ SECRETA)

---

## Instalação

### 1. Instalar Dependências

```bash
npm install @supabase/supabase-js
```

### 2. Configurar Variáveis de Ambiente

Adicione ao seu `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Veja mais detalhes em [VARIAVEIS_AMBIENTE.md](./VARIAVEIS_AMBIENTE.md)

---

## Criação do Schema

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse seu projeto no Supabase
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo do arquivo `schema.sql`
5. Clique em **Run** (ou pressione Ctrl+Enter)
6. Aguarde a execução (pode levar alguns minutos)

### Opção 2: Via Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref seu-project-ref

# Executar schema
supabase db push
```

---

## Variáveis de Ambiente

Consulte o arquivo [VARIAVEIS_AMBIENTE.md](./VARIAVEIS_AMBIENTE.md) para detalhes completos.

**Resumo das variáveis necessárias:**

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Migração de Dados

### Script de Migração

Um script de migração será criado para transferir dados do Firebase para Supabase.

**Próximos passos:**
1. Criar script de migração (`supabase/migrate.ts`)
2. Executar migração
3. Validar dados migrados

---

## Estrutura de Repositórios

### Arquitetura

```
src/lib/
├── supabase/
│   ├── client.ts          # Cliente Supabase
│   └── types.ts           # Tipos TypeScript
└── repositories/
    ├── supabase/          # Novos repositórios Supabase
    │   └── base-supabase-repository.ts
    └── ...                # Repositórios antigos (Firebase)
```

### Base Repository

Todos os repositórios Supabase herdam de `BaseSupabaseRepository` que:
- Implementa a interface `BaseRepository`
- Converte automaticamente entre camelCase (app) e snake_case (DB)
- Mantém compatibilidade com código existente

### Exemplo de Repositório

```typescript
import { BaseSupabaseRepository } from './base-supabase-repository';
import { supabase } from '@/lib/supabase/client';
import { Cliente } from '@/types';

export class ClienteSupabaseRepository extends BaseSupabaseRepository<Cliente> {
  constructor() {
    super('clientes', supabase);
  }

  protected convertFromSupabase(row: any): Cliente {
    return {
      id: row.id,
      nome: row.nome,
      cpf: row.cpf,
      email: row.email,
      // ... outros campos
      dataCadastro: new Date(row.data_cadastro),
    };
  }

  protected convertToSupabase(entity: Partial<Cliente>): any {
    return {
      nome: entity.nome,
      cpf: entity.cpf,
      email: entity.email,
      // ... outros campos
      data_cadastro: entity.dataCadastro?.toISOString(),
    };
  }
}
```

---

## Próximos Passos

1. ✅ Criar schema no Supabase
2. ✅ Configurar variáveis de ambiente
3. ⏳ Criar repositórios Supabase
4. ⏳ Criar script de migração
5. ⏳ Atualizar `RepositoryFactory`
6. ⏳ Testar migração
7. ⏳ Deploy gradual (feature flag)

---

## Suporte

Para dúvidas ou problemas:
- Documentação Supabase: https://supabase.com/docs
- Discord Supabase: https://discord.supabase.com

