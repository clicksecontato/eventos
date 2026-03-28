# Fase 2: partes e signatários do contrato

## Objetivo

Modelar **papéis** (partes) e **pessoas** que devem assinar, com API autenticada, UI na aba **Partes** e integração opcional no **gerar link** + atualização de status na **assinatura por link**.

## Banco

- Migração: `supabase/migrations/20260327120000_contrato_partes_signatarios.sql`
- Tabelas: `contrato_partes`, `contrato_parte_signatarios`
- `contratos_assinatura_convites.signatario_id` (nullable, FK para signatário)

## Tipos (`src/types/index.ts`)

- `PapelContratoParte`, `StatusContratoParteSignatario`, `ContratoParte`, `ContratoParteSignatario`, `ContratoParteComSignatarios`
- Novos eventos de auditoria: `parte_*`, `signatario_*`

## Repositório

- `ContratoParteSupabaseRepository` — árvore partes+signatários, CRUD
- `repositoryFactory.getContratoParteRepository()`

## APIs

| Método | Rota |
|--------|------|
| GET | `/api/contratos/[id]/partes` |
| POST | `/api/contratos/[id]/partes` — body: `papel`, `ordemAssinatura?`, `obrigatoria?` |
| PUT | `/api/contratos/[id]/partes/[parteId]` |
| DELETE | `/api/contratos/[id]/partes/[parteId]` |
| POST | `/api/contratos/[id]/partes/[parteId]/signatarios` — body: `nome`, `email`, `documento?` |
| PUT | `/api/contratos/[id]/signatarios/[signatarioId]` |
| DELETE | `/api/contratos/[id]/signatarios/[signatarioId]` |

## Fluxo de link

- `POST .../gerar-link-assinatura` aceita `signatarioId` opcional; nome/e-mail vêm do cadastro; convite grava `signatario_id`; status do signatário → `convite_enviado`.
- Sem partes/signatários, o fluxo **manual** (nome + e-mail no modal) permanece.

## Assinatura pública

- Após assinar, se o convite tiver `signatario_id`, o signatário passa para `assinado`.

## UI

- Aba **Partes** em `/contratos/[id]` com `ContratoPartesPanel` (somente leitura se contrato `assinado`).
- `GerarLinkAssinaturaClienteDialog`: opção de escolher signatário cadastrado ou modo manual.

## Compatibilidade / rollback

- Contratos antigos sem partes: sem mudança obrigatória de dados; link manual continua válido.
- Rollback de código sem reverter migração: colunas extras no banco não impedem versões antigas que não as usam (exceto se INSERT antigo falhar — manter migração aplicada).

## Próximo (Fase 3)

- Múltiplas assinaturas no PDF, estado agregado `coletando_assinaturas`, política de conclusão quando todos assinarem.
