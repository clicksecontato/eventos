# Comparação: Estrutura Firebase vs Supabase

## Data: 2025-01-XX

## Estrutura Firebase (Subcollections)

No Firebase Firestore, os dados eram organizados em **subcollections** aninhadas:

```
controle_users/
  └── {userId}/
      ├── clientes/
      │   └── {clienteId}/
      ├── eventos/
      │   └── {eventoId}/
      │       ├── pagamentos/
      │       │   └── {pagamentoId}/
      │       ├── custos/
      │       │   └── {custoId}/
      │       └── servicos/
      │           └── {servicoId}/
      ├── tipo_eventos/
      │   └── {tipoEventoId}/
      ├── tipo_custos/
      │   └── {tipoCustoId}/
      ├── tipo_servicos/
      │   └── {tipoServicoId}/
      └── canais_entrada/
          └── {canalId}/
```

**Características**:
- `userId` era parte do **caminho** da subcollection
- Não havia campo `userId` no documento
- Busca: `collection(db, 'controle_users', userId, 'clientes')`
- Isolamento automático por usuário (estrutural)

## Estrutura Supabase (Tabelas Relacionais)

No Supabase (PostgreSQL), os dados são organizados em **tabelas relacionais**:

```
users (tabela)
  ├── clientes (tabela com user_id)
  ├── eventos (tabela com user_id)
  │   ├── pagamentos (tabela com user_id + evento_id)
  │   ├── custos (tabela com user_id + evento_id)
  │   └── servicos_evento (tabela com user_id + evento_id)
  ├── tipo_eventos (tabela com user_id)
  ├── tipo_custos (tabela com user_id)
  ├── tipo_servicos (tabela com user_id)
  └── canais_entrada (tabela com user_id)
```

**Características**:
- `user_id` é uma **coluna** na tabela
- Relacionamentos via Foreign Keys
- Busca: `SELECT * FROM clientes WHERE user_id = ?`
- Isolamento por RLS (Row Level Security) ou filtro manual

## Comparação Tabela por Tabela

### 1. Clientes

#### Firebase (Subcollection)
```typescript
// Path: controle_users/{userId}/clientes/{clienteId}
// Busca
collection(db, 'controle_users', userId, 'clientes')

// Criação
await addDoc(
  collection(db, 'controle_users', userId, 'clientes'),
  clienteData // SEM userId no documento
)
```

#### Supabase (Tabela)
```sql
CREATE TABLE clientes (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  nome VARCHAR(255) NOT NULL,
  -- ... outros campos
);
```

```typescript
// Busca
await supabase
  .from('clientes')
  .select('*')
  .eq('user_id', userId)

// Criação
await supabase
  .from('clientes')
  .insert({
    ...clienteData,
    user_id: userId // COM user_id no registro
  })
```

**Status**: ✅ **ADAPTADO CORRETAMENTE**
- `ClienteSupabaseRepository.findAll(userId)` usa `.eq('user_id', userId)`
- `ClienteSupabaseRepository.createCliente()` adiciona `user_id` no insert

### 2. Eventos

#### Firebase (Subcollection)
```typescript
// Path: controle_users/{userId}/eventos/{eventoId}
collection(db, 'controle_users', userId, 'eventos')
```

#### Supabase (Tabela)
```sql
CREATE TABLE eventos (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  cliente_id VARCHAR(255) NOT NULL REFERENCES clientes(id),
  -- ... outros campos
);
```

**Status**: ✅ **ADAPTADO CORRETAMENTE**
- `EventoSupabaseRepository.findAll(userId)` usa `.eq('user_id', userId)`
- `EventoSupabaseRepository.createEvento()` adiciona `user_id` no insert

### 3. Pagamentos

#### Firebase (Subcollection de Eventos)
```typescript
// Path: controle_users/{userId}/eventos/{eventoId}/pagamentos/{pagamentoId}
collection(db, 'controle_users', userId, 'eventos', eventoId, 'pagamentos')
```

#### Supabase (Tabela com user_id + evento_id)
```sql
CREATE TABLE pagamentos (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id),
  -- ... outros campos
);
```

**Status**: ✅ **ADAPTADO CORRETAMENTE**
- `PagamentoSupabaseRepository.findAll(userId)` usa `.eq('user_id', userId)`
- `PagamentoSupabaseRepository.createPagamento()` adiciona `user_id` e `evento_id`
- Métodos específicos: `findByEventoId(userId, eventoId)` filtra por ambos

### 4. Custos

#### Firebase (Subcollection de Eventos)
```typescript
// Path: controle_users/{userId}/eventos/{eventoId}/custos/{custoId}
collection(db, 'controle_users', userId, 'eventos', eventoId, 'custos')
```

#### Supabase (Tabela com user_id + evento_id)
```sql
CREATE TABLE custos (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id),
  tipo_custo_id VARCHAR(255) NOT NULL REFERENCES tipo_custos(id),
  -- ... outros campos
);
```

**Status**: ✅ **ADAPTADO CORRETAMENTE**
- `CustoSupabaseRepository.findAll(userId)` usa `.eq('user_id', userId)`
- `CustoSupabaseRepository.createCusto()` adiciona `user_id` e `evento_id`

### 5. Serviços de Evento

#### Firebase (Subcollection de Eventos)
```typescript
// Path: controle_users/{userId}/eventos/{eventoId}/servicos/{servicoId}
collection(db, 'controle_users', userId, 'eventos', eventoId, 'servicos')
```

#### Supabase (Tabela com user_id + evento_id)
```sql
CREATE TABLE servicos_evento (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id),
  tipo_servico_id VARCHAR(255) NOT NULL REFERENCES tipo_servicos(id),
  -- ... outros campos
);
```

**Status**: ✅ **ADAPTADO CORRETAMENTE**
- `ServicoEventoSupabaseRepository.findByEventoId(userId, eventoId)` filtra por ambos
- `ServicoEventoSupabaseRepository.createServicoEvento()` adiciona `user_id` e `evento_id`

### 6. Tipo Eventos

#### Firebase (Subcollection)
```typescript
// Path: controle_users/{userId}/tipo_eventos/{tipoEventoId}
collection(db, 'controle_users', userId, 'tipo_eventos')
```

#### Supabase (Tabela)
```sql
CREATE TABLE tipo_eventos (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  nome VARCHAR(255) NOT NULL,
  -- ... outros campos
);
```

**Status**: ✅ **ADAPTADO CORRETAMENTE**
- `TipoEventoSupabaseRepository.findAll(userId)` usa `.eq('user_id', userId)`
- `TipoEventoSupabaseRepository.createTipoEvento()` adiciona `user_id`

### 7. Tipo Custos

#### Firebase (Subcollection)
```typescript
// Path: controle_users/{userId}/tipo_custos/{tipoCustoId}
collection(db, 'controle_users', userId, 'tipo_custos')
```

#### Supabase (Tabela)
```sql
CREATE TABLE tipo_custos (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  nome VARCHAR(255) NOT NULL,
  -- ... outros campos
);
```

**Status**: ✅ **ADAPTADO CORRETAMENTE**
- `TipoCustoSupabaseRepository.findAll(userId)` usa `.eq('user_id', userId)`
- `TipoCustoSupabaseRepository.createTipoCusto()` adiciona `user_id`

### 8. Tipo Serviços

#### Firebase (Subcollection)
```typescript
// Path: controle_users/{userId}/tipo_servicos/{tipoServicoId}
collection(db, 'controle_users', userId, 'tipo_servicos')
```

#### Supabase (Tabela)
```sql
CREATE TABLE tipo_servicos (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  nome VARCHAR(255) NOT NULL,
  -- ... outros campos
);
```

**Status**: ✅ **ADAPTADO CORRETAMENTE**
- `TipoServicoSupabaseRepository.findAll(userId)` usa `.eq('user_id', userId)`
- `TipoServicoSupabaseRepository.createTipoServico()` adiciona `user_id`

### 9. Canais de Entrada

#### Firebase (Subcollection)
```typescript
// Path: controle_users/{userId}/canais_entrada/{canalId}
collection(db, 'controle_users', userId, 'canais_entrada')
```

#### Supabase (Tabela)
```sql
CREATE TABLE canais_entrada (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  nome VARCHAR(255) NOT NULL,
  -- ... outros campos
);
```

**Status**: ✅ **ADAPTADO CORRETAMENTE**
- `CanalEntradaSupabaseRepository.findAll(userId)` usa `.eq('user_id', userId)`
- `CanalEntradaSupabaseRepository.createCanalEntrada()` adiciona `user_id`

## Verificação de Adaptação Completa

### ✅ Todas as Tabelas com user_id

Todas as tabelas que eram subcollections agora têm coluna `user_id`:

| Tabela | user_id | Status |
|--------|---------|--------|
| clientes | ✅ | OK |
| eventos | ✅ | OK |
| pagamentos | ✅ | OK (também tem evento_id) |
| custos | ✅ | OK (também tem evento_id) |
| servicos_evento | ✅ | OK (também tem evento_id) |
| tipo_eventos | ✅ | OK |
| tipo_custos | ✅ | OK |
| tipo_servicos | ✅ | OK |
| canais_entrada | ✅ | OK |

### ✅ Todos os Repositórios Adaptados

Todos os repositórios Supabase implementam corretamente:

1. **Busca por user_id**: Todos os métodos `findAll(userId)` filtram por `user_id`
2. **Criação com user_id**: Todos os métodos `create*()` adicionam `user_id` no insert
3. **Atualização com filtro**: Todos os métodos `update*()` filtram por `user_id` e `id`
4. **Busca por ID**: Todos os métodos `findById()` filtram por `user_id` e `id`

### ✅ Estrutura Relacional

As relações foram mantidas:

- `eventos.cliente_id` → `clientes.id`
- `pagamentos.evento_id` → `eventos.id`
- `pagamentos.user_id` → `users.id`
- `custos.evento_id` → `eventos.id`
- `custos.tipo_custo_id` → `tipo_custos.id`
- `servicos_evento.evento_id` → `eventos.id`
- `servicos_evento.tipo_servico_id` → `tipo_servicos.id`
- `clientes.canal_entrada_id` → `canais_entrada.id`

## Diferenças Importantes

### 1. Isolamento por Usuário

**Firebase**: 
- Automático pela estrutura (subcollection)
- Não precisa filtrar manualmente

**Supabase**:
- Manual via filtro `WHERE user_id = ?`
- RLS pode ajudar, mas estamos usando service role para inicialização

### 2. Busca de Relacionamentos

**Firebase**:
```typescript
// Buscar cliente de um evento (sem join)
const clienteRef = doc(db, 'controle_users', userId, 'clientes', evento.clienteId);
const clienteDoc = await getDoc(clienteRef);
```

**Supabase**:
```typescript
// Buscar evento com cliente (com join)
const { data } = await supabase
  .from('eventos')
  .select('*, clientes(*)')
  .eq('id', eventoId)
  .eq('user_id', userId);
```

### 3. Performance

**Firebase**:
- Múltiplas queries para buscar relacionamentos
- Sem joins nativos

**Supabase**:
- Joins nativos do PostgreSQL
- Mais eficiente para relacionamentos

## Conclusão

✅ **TODA A ESTRUTURA FOI ADAPTADA CORRETAMENTE**

Todas as tabelas que eram subcollections no Firebase agora são tabelas relacionais no Supabase com:
- ✅ Coluna `user_id` em todas as tabelas
- ✅ Foreign keys para relacionamentos
- ✅ Todos os repositórios filtram por `user_id`
- ✅ Todas as inserções incluem `user_id`
- ✅ Todas as atualizações filtram por `user_id` e `id`

**A migração estrutural está completa!** 🎉













