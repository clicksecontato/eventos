# Correção: Relatórios sendo criados em Firestore e Supabase

## Data: 2025-01-XX

## Problema Identificado

Quando acessamos "/relatórios" na primeira vez do dia ou clicamos em "Atualizar Relatórios", os relatórios estavam sendo gerados no Supabase (correto), mas também estavam sendo criados no Firestore (incorreto).

### Causa Raiz

A página `/relatorios/page.tsx` estava usando diretamente `new RelatoriosDiariosRepository()`, que é o repositório do Firestore, ao invés de usar o `repositoryFactory.getRelatoriosDiariosRepository()`, que retorna o repositório correto baseado na configuração (`NEXT_PUBLIC_USE_SUPABASE`).

Isso causava:
- **Leitura**: A página lia do Firestore (mesmo quando Supabase estava configurado)
- **Escrita**: Os serviços (`RelatoriosReportService` e `DashboardReportService`) já estavam salvando no Supabase corretamente via `repositoryFactory`
- **Resultado**: Relatórios sendo criados no Supabase, mas a página tentando ler do Firestore

## Alterações Realizadas

### 1. Atualização da Página de Relatórios

**Arquivo**: `src/app/relatorios/page.tsx`

**Mudanças**:
- Removido import direto de `RelatoriosDiariosRepository`
- Adicionado import de `repositoryFactory`
- Substituído `new RelatoriosDiariosRepository()` por `repositoryFactory.getRelatoriosDiariosRepository()` em dois locais:
  1. No `useEffect` que busca a data de atualização (linha ~41)
  2. No `handleRefresh` que busca dados após atualizar (linha ~89)

**Antes**:
```typescript
import { RelatoriosDiariosRepository } from '@/lib/repositories/relatorios-diarios-repository';

// ...
const relatoriosRepo = new RelatoriosDiariosRepository();
```

**Depois**:
```typescript
import { repositoryFactory } from '@/lib/repositories/repository-factory';

// ...
const relatoriosRepo = repositoryFactory.getRelatoriosDiariosRepository();
```

## Verificações Realizadas

### 1. Serviços de Relatórios
- ✅ `RelatoriosReportService` já estava usando `repositoryFactory.getRelatoriosDiariosRepository()`
- ✅ `DashboardReportService` já estava usando `repositoryFactory.getRelatoriosDiariosRepository()`

### 2. Outras Referências
- ✅ Verificado que não há outras referências diretas a `new RelatoriosDiariosRepository()` que salvam dados
- ✅ Todas as leituras e escritas agora passam pelo `repositoryFactory`

## Resultado Esperado

Agora, quando o sistema está configurado para usar Supabase (`NEXT_PUBLIC_USE_SUPABASE=true`):

1. **Geração de Relatórios**: Os relatórios são gerados e salvos **apenas no Supabase**
2. **Leitura de Relatórios**: Os relatórios são lidos **apenas do Supabase**
3. **Sem Duplicação**: Não há mais criação de relatórios no Firestore quando Supabase está ativo

## Configuração Necessária

Para garantir que o sistema use apenas Supabase:

1. Verificar se `.env.local` contém:
   ```
   NEXT_PUBLIC_USE_SUPABASE=true
   NEXT_PUBLIC_SUPABASE_URL=<sua-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave>
   ```

2. Reiniciar o servidor de desenvolvimento após alterar variáveis de ambiente

## Arquivos Modificados

1. `src/app/relatorios/page.tsx` - Atualizado para usar `repositoryFactory`

## Arquivos Verificados (sem alterações necessárias)

1. `src/lib/services/relatorios-report-service.ts` - ✅ Já estava correto
2. `src/lib/services/dashboard-report-service.ts` - ✅ Já estava correto
3. `src/lib/repositories/repository-factory.ts` - ✅ Funcionando corretamente

## Notas Técnicas

- O `RepositoryFactory` decide qual repositório usar baseado na variável `NEXT_PUBLIC_USE_SUPABASE`
- Quando `NEXT_PUBLIC_USE_SUPABASE=true` e as credenciais do Supabase estão configuradas, retorna `RelatoriosDiariosSupabaseRepository`
- Quando não configurado, retorna `RelatoriosDiariosRepository` (Firestore) como fallback
- A interface dos repositórios é idêntica, garantindo compatibilidade

