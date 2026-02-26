# Migração de Relatórios para Supabase

## Data: 2025-01-XX

## Objetivo
Migrar os repositórios de relatórios do Firebase/Firestore para Supabase, mantendo compatibilidade com o código existente.

## Estrutura Criada

### 1. Tabelas no Supabase

#### `relatorios_diarios`
- **ID**: `VARCHAR(255)` - Formato: `userId_dateKey` (ex: `user123_20250115`)
- **user_id**: Referência ao usuário
- **date_key**: `VARCHAR(8)` - Formato `yyyyMMdd`
- **data_geracao**: Timestamp de geração
- **dashboard**: JSONB - Dados do dashboard
- **detalhamento_receber**: JSONB - Relatório de detalhamento a receber
- **receita_mensal**: JSONB - Relatório de receita mensal
- **performance_eventos**: JSONB - Relatório de performance de eventos
- **fluxo_caixa**: JSONB - Relatório de fluxo de caixa
- **servicos**: JSONB - Relatório de serviços
- **canais_entrada**: JSONB - Relatório de canais de entrada
- **impressoes**: JSONB - Relatório de impressões
- **UNIQUE(user_id, date_key)**: Garante um relatório por usuário por dia

#### `relatorios_cache`
- **ID**: `VARCHAR(255)` - Formato: `yyyy-MM-dd` (ex: `2025-01-15`)
- **user_id**: Referência ao usuário
- **data_geracao**: Timestamp de geração
- **periodo_inicio**: Timestamp de início do período
- **periodo_fim**: Timestamp de fim do período
- **resumo_geral**: JSONB - Resumo geral
- **receita_mensal**: JSONB - Receita mensal
- **eventos_resumo**: JSONB - Resumo de eventos
- **fluxo_caixa**: JSONB - Fluxo de caixa
- **servicos_resumo**: JSONB - Resumo de serviços
- **canais_entrada_resumo**: JSONB - Resumo de canais de entrada
- **impressoes_resumo**: JSONB - Resumo de impressões
- **performance_eventos**: JSONB - Performance de eventos
- **UNIQUE(user_id, id)**: Garante um snapshot por usuário por ID

## Repositórios Criados

### 1. `RelatoriosDiariosSupabaseRepository`

**Arquivo**: `src/lib/repositories/supabase/relatorios-diarios-supabase-repository.ts`

**Métodos implementados**:
- `getRelatorioDiario(userId, dateKey)`: Busca um relatório diário específico
- `salvarDashboard(userId, dateKey, payload, dataGeracao)`: Salva dados do dashboard
- `salvarRelatorio(userId, dateKey, tipoRelatorio, payload, dataGeracao)`: Salva um tipo específico de relatório
- `salvarMultiplosRelatorios(userId, dateKey, relatorios, dataGeracao)`: Salva múltiplos relatórios de uma vez

**Características**:
- Usa `userId_dateKey` como ID para garantir unicidade
- Usa `upsert` com `onConflict: 'id'` para criar ou atualizar
- Mantém compatibilidade com a interface do repositório Firebase

### 2. `RelatorioCacheSupabaseRepository`

**Arquivo**: `src/lib/repositories/supabase/relatorio-cache-supabase-repository.ts`

**Métodos implementados**:
- `getLatestSnapshot(userId)`: Busca o snapshot mais recente
- `createOrUpdateSnapshot(userId, snapshot)`: Cria ou atualiza um snapshot
- `getSnapshotById(userId, snapshotId)`: Busca um snapshot específico por ID
- `listSnapshots(userId, limit)`: Lista os últimos N snapshots
- `cleanupOldSnapshots(userId, keepDays)`: Remove snapshots antigos

**Características**:
- Usa `yyyy-MM-dd` como ID padrão se não fornecido
- Usa `upsert` com `onConflict: 'id'` para criar ou atualizar
- Mantém compatibilidade com a interface do repositório Firebase

## Atualizações no RepositoryFactory

**Arquivo**: `src/lib/repositories/repository-factory.ts`

**Mudanças**:
1. Adicionados imports dos repositórios Supabase de relatórios
2. Adicionadas propriedades privadas para os repositórios (Firebase | Supabase)
3. Inicialização condicional baseada em `useSupabase`
4. Métodos getter adicionados:
   - `getRelatoriosDiariosRepository()`
   - `getRelatorioCacheRepository()`

## Schema SQL Atualizado

**Arquivo**: `supabase/schema.sql`

**Mudanças na tabela `relatorios_diarios`**:
- Adicionados campos JSONB para todos os tipos de relatórios:
  - `detalhamento_receber`
  - `receita_mensal`
  - `performance_eventos`
  - `fluxo_caixa`
  - `servicos`
  - `canais_entrada`
  - `impressoes`

## Compatibilidade

Os repositórios Supabase mantêm a mesma interface dos repositórios Firebase, garantindo que o código existente continue funcionando sem alterações. O `RepositoryFactory` gerencia automaticamente qual repositório usar baseado na variável de ambiente `NEXT_PUBLIC_USE_SUPABASE`.

## Atualizações nos Serviços

**Arquivos atualizados**:
1. `src/lib/services/dashboard-report-service.ts`
   - Removido import direto de `RelatoriosDiariosRepository`
   - Atualizado para usar `repositoryFactory.getRelatoriosDiariosRepository()`

2. `src/lib/services/relatorio-cache-service.ts`
   - Removido import direto de `RelatorioCacheRepository`
   - Atualizado para usar `repositoryFactory.getRelatorioCacheRepository()`

3. `src/lib/services/relatorios-report-service.ts`
   - Removido import direto de `RelatoriosDiariosRepository`
   - Atualizado para usar `repositoryFactory.getRelatoriosDiariosRepository()`

## Próximos Passos

1. ✅ Criar repositórios Supabase
2. ✅ Atualizar RepositoryFactory
3. ✅ Atualizar schema SQL
4. ✅ Atualizar serviços para usar RepositoryFactory
5. ⏳ Criar script de migração de dados (se necessário)
6. ⏳ Testar funcionalidade completa

## Notas

- Os repositórios não estendem `BaseSupabaseRepository` porque têm interfaces específicas diferentes da interface `BaseRepository`
- Os IDs são gerados de forma diferente do Firebase para garantir unicidade no Supabase
- Todos os campos JSONB podem ser `null` para permitir flexibilidade na estrutura dos relatórios
