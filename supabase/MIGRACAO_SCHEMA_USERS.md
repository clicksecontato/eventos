# ⚠️ IMPORTANTE: Atualização do Schema - Tabela Users

## Mudança Necessária

A tabela `users` foi alterada para aceitar Firebase UIDs (strings) ao invés de UUIDs.

### Antes:
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

### Depois:
```sql
id VARCHAR(255) PRIMARY KEY  -- Firebase UID ou UUID string
```

### Por quê?

O sistema usa **Firebase Auth** para autenticação, que retorna UIDs como strings (ex: `"abc123def456"`). Para manter compatibilidade, o Supabase precisa aceitar esses IDs.

## Como Aplicar a Mudança

### Opção 1: Recriar a tabela (se ainda não tem dados)

Execute este SQL no Supabase:

```sql
-- Dropar tabela se existir (CUIDADO: apaga todos os dados!)
DROP TABLE IF EXISTS users CASCADE;

-- Recriar com o novo schema
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    assinatura JSONB,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_ativo ON users(ativo) WHERE ativo = true;
```

### Opção 2: Alterar tabela existente (se já tem dados)

```sql
-- 1. Alterar tipo da coluna id
ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(255);

-- 2. Remover default (não é mais necessário)
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- 3. Atualizar todas as foreign keys
-- (Isso será feito automaticamente quando você executar o schema.sql completo)
```

## Sincronização Automática

O sistema agora sincroniza automaticamente usuários do Firebase para o Supabase no login:

- Quando um usuário faz login via Firebase Auth
- O sistema verifica se ele existe no Supabase
- Se não existir, cria automaticamente
- Se existir, atualiza os dados se necessário

## Próximos Passos

1. **Se você JÁ criou as tabelas**: Execute `migrate-user-id-to-varchar.sql` primeiro
2. **Se você AINDA NÃO criou as tabelas**: Execute apenas o `schema.sql` atualizado
3. Faça login novamente para sincronizar seu usuário
4. Verifique se os dados aparecem corretamente

## Script de Migração

Foi criado o arquivo `migrate-user-id-to-varchar.sql` que atualiza todas as tabelas existentes.
Execute este script no SQL Editor do Supabase se você já tinha criado as tabelas antes.

