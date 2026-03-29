# Modularização — `EventoViewPage`

## Objetivo

Dividir o detalhe do evento (~1140 linhas) em componentes e utilitários em `src/components/eventos/`, mantendo `EventoViewPage.tsx` como orquestrador (hooks, estado, handlers).

## Novos arquivos

| Arquivo | Conteúdo |
|---------|----------|
| `evento-view-cores.ts` | `classeCorStatusAgendamentoAlocacao` (badges de alocação). |
| `evento-view-format.ts` | `formatarDiaSemanaTitulo` (date-fns). |
| `evento-view-copy-text.ts` | `formatarTextoEventoParaCopiar` (texto para clipboard). |
| `EventoViewPageHeader.tsx` | Título, cliente, data, ações (voltar, contrato, copiar, editar, arquivar). |
| `EventoViewPageNavAtalhos.tsx` | Submenu sticky com scroll para âncoras (`basico`, `pagamentos`, …). |
| `EventoViewPageStatusBar.tsx` | `EventoStatusSelect` + data de cadastro. |
| `EventoBasicoSection.tsx` | Grid: cliente, evento, agendamento/alocações, observações. |
| `EventoResumoFinanceiroSection.tsx` | Card resumo financeiro + divergência modo manual/automático. |
| `EventoContratosSection.tsx` | Card Contratos (lista, PDF, `ContratoSignatariosLinksLista`). |

## `EventoViewPage.tsx` (~400 linhas)

- Hooks de dados, efeitos de permissão e agendamento.
- Early returns: loading (`LoadingHotmart`), erro, não encontrado (UI rica com voltar).
- Handlers: delete, pagamentos/custos/serviços/anexos, cópia, status, PDF, link signatário.
- Agregados financeiros e composição das secções + `PagamentoHistorico`, `CustosEvento`, `ServicosEvento`, `AnexosEvento`, `ConfirmationDialog`.

## Limpeza

- Removidos early returns duplicados e função `getStatusColor` não utilizada.
- Removido estado `refreshKey` (não referenciado).

## Testes (baixo ruído por módulo)

| Arquivo | Escopo |
|---------|--------|
| `evento-view-test-fixtures.ts` | Factories mínimas (`eventoEventoViewMinimo`, cliente, alocação, serviço). |
| `evento-view-cores.test.ts` | `classeCorStatusAgendamentoAlocacao`. |
| `evento-view-format.test.ts` | `formatarDiaSemanaTitulo`. |
| `evento-view-copy-text.test.ts` | `formatarTextoEventoParaCopiar` (serviços, alocações, cancelados). |
| `EventoResumoFinanceiroSection.test.tsx` | Totais, modo, divergência manual/automático. |
| `EventoViewPageStatusBar.test.tsx` | Mock do `EventoStatusSelect` + data cadastro. |
| `EventoBasicoSection.test.tsx` | Conteúdo básico + botão Gerenciar. |
| `EventoViewPageNavAtalhos.test.tsx` | `getElementById` + `scrollTo` com offset. |
| `EventoContratosSection.test.tsx` | Estado vazio com/sem plano. |
| `EventoViewPage.test.tsx` | Integração ponta a ponta (mocks amplos); ver comentário no ficheiro. |

Comando: `npx vitest run src/components/eventos/`

## Validação

- `npx tsc --noEmit`
- `npx vitest run src/components/eventos/`
