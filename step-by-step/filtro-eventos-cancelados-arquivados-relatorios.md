# Filtro de Eventos Cancelados e Arquivados nos Relatórios

## Data: 2025-01-27

## Problema
Nos relatórios, dashboard e cálculos de relatórios, não devemos calcular valores de eventos "cancelados" ou "arquivados". Esses eventos devem ser excluídos de todos os cálculos financeiros e estatísticos.

## Solução Implementada

### 1. Criação de Função Helper
Criado arquivo `src/lib/utils/evento-filters.ts` com funções utilitárias para filtrar eventos válidos:

- `isEventoValidoParaCalculo(evento: Evento)`: Verifica se um evento é válido (não cancelado e não arquivado)
- `filtrarEventosValidos(eventos: Evento[])`: Filtra array de eventos, retornando apenas os válidos
- `filtrarEventosValidosComValor(eventos: Evento[])`: Filtra eventos válidos com valor total maior que zero

### 2. Aplicação nos Serviços de Backend

#### DashboardReportService (`src/lib/services/dashboard-report-service.ts`)
- Aplicado filtro em `calcularDashboardData()` para excluir eventos cancelados/arquivados de:
  - Eventos de hoje
  - Eventos do mês
  - Eventos próximos
  - Cálculos financeiros (valor pendente, valor atrasado)
  - Contagem de eventos por tipo
  - Resumo financeiro
- Aplicado filtro em `calcularPeriodosResumo()` para excluir eventos cancelados/arquivados dos períodos de resumo

#### RelatoriosReportService (`src/lib/services/relatorios-report-service.ts`)
- Aplicado filtro em `gerarDetalhamentoReceber()` para excluir eventos cancelados/arquivados
- Aplicado filtro em `gerarPerformanceEventos()` para excluir eventos cancelados/arquivados (mantendo contagem de cancelados para estatísticas)
- Aplicado filtro em `gerarServicos()` para excluir eventos cancelados/arquivados e seus serviços
- Aplicado filtro em `gerarCanaisEntrada()` para excluir eventos cancelados/arquivados
- Aplicado filtro em `gerarImpressoes()` para excluir eventos cancelados/arquivados

#### RelatorioCacheService (`src/lib/services/relatorio-cache-service.ts`)
- Substituído `eventos.filter(e => !e.arquivado)` por `filtrarEventosValidos(eventos)` em todos os métodos:
  - `calcularResumoGeral()`
  - `calcularEventosResumo()`
  - Outros métodos que calculam métricas

### 3. Aplicação nos Componentes de Frontend

#### DetalhamentoReceberReport (`src/components/relatorios/DetalhamentoReceberReport.tsx`)
- Aplicado filtro `filtrarEventosValidosComValor()` antes de calcular resumos financeiros
- Aplicado filtro no `useMemo` que calcula o resumo por cliente

#### PerformanceEventosReport (`src/components/relatorios/PerformanceEventosReport.tsx`)
- Aplicado filtro `filtrarEventosValidos()` antes de filtrar por período de datas

#### ImpressoesReport (`src/components/relatorios/ImpressoesReport.tsx`)
- Aplicado filtro `filtrarEventosValidos()` antes de filtrar eventos do período

#### ServicosReport (`src/components/relatorios/ServicosReport.tsx`)
- Aplicado filtro `filtrarEventosValidos()` antes de filtrar eventos do período

#### CanaisEntradaReport (`src/components/relatorios/CanaisEntradaReport.tsx`)
- Aplicado filtro `filtrarEventosValidos()` antes de associar eventos aos canais de entrada

## Arquivos Modificados

1. `src/lib/utils/evento-filters.ts` (novo)
2. `src/lib/services/dashboard-report-service.ts`
3. `src/lib/services/relatorios-report-service.ts`
4. `src/lib/services/relatorio-cache-service.ts`
5. `src/components/relatorios/DetalhamentoReceberReport.tsx`
6. `src/components/relatorios/PerformanceEventosReport.tsx`
7. `src/components/relatorios/ImpressoesReport.tsx`
8. `src/components/relatorios/ServicosReport.tsx`
9. `src/components/relatorios/CanaisEntradaReport.tsx`

## Regra de Negócio

**Eventos excluídos dos cálculos:**
- Eventos com `status === 'Cancelado'` ou `status === StatusEvento.CANCELADO`
- Eventos com `arquivado === true`

**Eventos incluídos nos cálculos:**
- Todos os outros eventos (Agendado, Confirmado, Em andamento, Concluído)
- Eventos não arquivados (`arquivado === false` ou `undefined`)

## Impacto

- **Dashboard**: Valores financeiros (receita, pendente, atrasado) agora excluem eventos cancelados/arquivados
- **Relatórios**: Todos os cálculos de relatórios agora excluem eventos cancelados/arquivados
- **Componentes Frontend**: Visualizações de relatórios agora mostram apenas dados de eventos válidos

## Observações

- A contagem de eventos cancelados pode ser mantida para estatísticas (ex: taxa de cancelamento), mas não são incluídos nos cálculos financeiros
- Eventos arquivados são completamente excluídos de todos os cálculos
- A função helper centraliza a lógica de filtragem, facilitando manutenção futura
