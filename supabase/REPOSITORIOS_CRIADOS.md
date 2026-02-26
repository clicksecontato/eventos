# Repositórios Supabase Criados

## ✅ Repositórios Implementados

### 1. Base Repository
- **Arquivo**: `src/lib/repositories/supabase/base-supabase-repository.ts`
- **Descrição**: Classe base que implementa `BaseRepository` usando Supabase
- **Funcionalidades**:
  - Conversão automática camelCase ↔ snake_case
  - Métodos CRUD básicos
  - Suporte a queries com filtros
  - Compatível com interface existente

### 2. Cliente Repository
- **Arquivo**: `src/lib/repositories/supabase/cliente-supabase-repository.ts`
- **Métodos implementados**:
  - `findByEmail()`
  - `findByCpf()`
  - `searchByName()` (com busca de texto)
  - `getRecentClientes()`
  - `getAtivos()` (com filtro no banco)
  - `getArquivados()`
  - `createCliente()`, `updateCliente()`, `deleteCliente()`
  - `desarquivarCliente()`
  - `countClientesPorAno()`

### 3. Evento Repository
- **Arquivo**: `src/lib/repositories/supabase/evento-supabase-repository.ts`
- **Métodos implementados**:
  - `findByClienteId()`
  - `findByStatus()`
  - `findByTipoEvento()`
  - `findByDataEvento()`
  - `getEventosHoje()`
  - `getProximosEventos()` (com limite)
  - `getEventosPorMes()`
  - `searchByLocal()` (com busca de texto)
  - `getAtivos()` (com filtro no banco - otimizado!)
  - `getArquivados()`
  - `createEvento()`, `updateEvento()`, `deleteEvento()`
  - `desarquivarEvento()`

### 4. Pagamento Repository
- **Arquivo**: `src/lib/repositories/supabase/pagamento-supabase-repository.ts`
- **Métodos implementados**:
  - `findByEventoId()`
  - `findByStatus()`
  - `findByFormaPagamento()`
  - `findByDataPagamento()`
  - `getPagamentosPorMes()`
  - `getPagamentosPendentes()`
  - `getTotalRecebidoPorPeriodo()`
  - `getResumoFinanceiroPorEvento()`
  - `createPagamento()`, `updatePagamento()`, `deletePagamento()`

### 5. Tipo Evento Repository
- **Arquivo**: `src/lib/repositories/supabase/tipo-evento-supabase-repository.ts`
- **Métodos implementados**:
  - `findByNome()`
  - `getAtivos()`
  - `searchByName()`
  - `createTipoEvento()`, `updateTipoEvento()`, `deleteTipoEvento()`
  - `reativarTipoEvento()`
  - `getInativos()`

### 6. Canal Entrada Repository
- **Arquivo**: `src/lib/repositories/supabase/canal-entrada-supabase-repository.ts`
- **Métodos implementados**:
  - `getAtivos()`
  - `searchByName()`
  - `createCanalEntrada()`
  - `getCanalEntradaById()`

### 7. Tipo Custo Repository
- **Arquivo**: `src/lib/repositories/supabase/tipo-custo-supabase-repository.ts`
- **Métodos implementados**:
  - `getAtivos()`
  - `searchByName()`
  - `createTipoCusto()`

### 8. Tipo Serviço Repository
- **Arquivo**: `src/lib/repositories/supabase/tipo-servico-supabase-repository.ts`
- **Métodos implementados**:
  - `getAtivos()`
  - `searchByName()`
  - `createTipoServico()`

### 9. Custo Repository
- **Arquivo**: `src/lib/repositories/supabase/custo-supabase-repository.ts`
- **Métodos implementados**:
  - `findByEventoId()` (com JOIN para tipo_custos)
  - `createCusto()`, `updateCusto()`, `deleteCusto()`
  - Carrega relacionamento com `tipoCusto` automaticamente

### 10. Serviço Evento Repository
- **Arquivo**: `src/lib/repositories/supabase/servico-evento-supabase-repository.ts`
- **Métodos implementados**:
  - `findByEventoId()` (com JOIN para tipo_servicos)
  - `createServicoEvento()`, `updateServicoEvento()`, `deleteServicoEvento()`
  - Carrega relacionamento com `tipoServico` automaticamente

---

## 🔄 Próximos Passos

### 1. Atualizar RepositoryFactory
Criar uma versão que use os repositórios Supabase ou adicionar feature flag para alternar entre Firebase e Supabase.

### 2. Criar Script de Migração
Script para migrar dados do Firebase para Supabase.

### 3. Testes
Testar todos os repositórios criados.

### 4. Atualizar DataService
Atualizar `dataService` para usar os novos repositórios.

---

## 📝 Notas Importantes

1. **Interface Compatível**: Todos os repositórios mantêm a mesma interface dos repositórios Firebase
2. **Conversão Automática**: Conversão entre camelCase (app) e snake_case (DB) é automática
3. **JOINs Automáticos**: Repositórios de Custo e Serviço fazem JOIN automático com tipos relacionados
4. **Filtros Otimizados**: `getAtivos()` agora usa filtro no banco ao invés de filtrar no código
5. **Busca de Texto**: Usa `ilike` do PostgreSQL para buscas case-insensitive

---

## 🚀 Como Usar

```typescript
import { ClienteSupabaseRepository } from '@/lib/repositories/supabase/cliente-supabase-repository';

const clienteRepo = new ClienteSupabaseRepository();
const clientes = await clienteRepo.getAtivos(userId);
```

Todos os métodos mantêm a mesma assinatura dos repositórios Firebase, então a migração será transparente!

