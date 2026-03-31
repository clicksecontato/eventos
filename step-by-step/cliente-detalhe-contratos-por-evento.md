# Cliente: contratos por evento na seção "Eventos do Cliente"

## Objetivo

Na rota `/clientes/[id]`, em **Eventos do Cliente**, exibir, para cada evento, a lista de contratos vinculados àquele evento (quando existirem), com título, status e atalho para abrir o contrato.

## Alterações

### `src/hooks/useData.ts`

- Novo hook **`useContratosAgrupadosPorEventos(eventoIds: string[])`**:
  - Faz **uma** requisição `GET /api/contratos` (mesmo padrão da listagem geral).
  - Filtra contratos cujo `eventoId` está em `eventoIds`.
  - Devolve `Record<string, Contrato[]>` com chave = id do evento (arrays vazios para eventos sem contrato).
  - Se `eventoIds` for vazio, não chama a API e retorna `{}`.

### `src/app/clientes/[id]/page.tsx`

- Obtém `idsEventosCliente` com `useMemo` a partir de `eventosOrdenados`.
- Usa o novo hook para `contratosPorEvento`.
- Mensagem curta **"Carregando contratos dos eventos…"** enquanto a lista de contratos carrega (sem bloquear o restante da página).
- Em cada card de evento: bloco **"Contratos deste evento (N)"** com lista (ordenada por `dataCadastro` descendente), nome do modelo ou número do contrato, rótulo de status via `obterExibicaoStatusContratoNaLista`, botão **Abrir contrato** → `/contratos/[id]`.

### `src/app/clientes/[id]/page.test.tsx`

- Mock de `useContratosAgrupadosPorEventos` com um contrato de exemplo.
- Asserções: texto do modelo e botão "Abrir contrato".

## Observações de produto

- Contratos aparecem apenas após o carregamento do hook; eventos sem contrato não mostram o bloco (apenas o card do evento como antes).
- Performance: para contas com muitos contratos no tenant, o `GET /api/contratos` retorna todos; se isso pesar no futuro, dá para evoluir a API com filtro por vários `eventoId` ou por `clienteId`.

## Validação sugerida

- `./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run src/app/clientes/[id]/page.test.tsx`
