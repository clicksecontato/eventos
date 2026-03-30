# Contratos — status `document_closed`

## Objetivo

Implementar o status `document_closed` quando **todos os signatários** concluírem a assinatura e, a partir desse ponto, bloquear alterações no contrato.

## Alterações realizadas

| Arquivo | Alteração |
|---|---|
| `src/types/index.ts` | Tipo de `Contrato.status` atualizado para incluir `document_closed`. |
| `src/app/api/assinatura/contrato/[token]/assinar/route.ts` | Assinatura por link agora calcula `statusFinalContrato`: `document_closed` quando todos os signatários da árvore estiverem `assinado`; caso contrário mantém `assinado`. Fluxo legado sem signatário vinculado fecha direto em `document_closed`. |
| `src/app/api/contratos/[id]/assinar-pdf/route.ts` | Assinatura interna passa a gravar `status: document_closed`. |
| `src/app/api/contratos/[id]/route.ts` | `PUT` bloqueado quando contrato já está `document_closed`. |
| `src/app/api/contratos/[id]/gerar-pdf/route.ts` | Bloqueia geração de PDF para contrato fechado. |
| `src/app/api/contratos/[id]/gerar-link-assinatura/route.ts` | Bloqueia novos links para contrato fechado. |
| `src/app/api/contratos/[id]/partes/route.ts` | Bloqueia criação de parte em contrato fechado (GET permanece liberado). |
| `src/app/api/contratos/[id]/partes/[parteId]/route.ts` | Bloqueia edição/exclusão de parte em contrato fechado. |
| `src/app/api/contratos/[id]/partes/[parteId]/signatarios/route.ts` | Bloqueia criação de signatário em contrato fechado. |
| `src/app/api/contratos/[id]/signatarios/[signatarioId]/route.ts` | Bloqueia edição/exclusão de signatário em contrato fechado. |
| `src/lib/utils/contrato-listagem-assinaturas.ts` | Rótulo `Documento fechado`; filtro `assinado` também considera `document_closed` como concluído. |
| `src/app/contratos/page.tsx` | Badge/cor para `document_closed`, opção de filtro e texto de filtro ativo; botão baixar PDF também para contratos fechados. |
| `src/app/contratos/[id]/page.tsx` | Modo somente leitura em Partes para `document_closed`; exibição de data de assinatura também para contrato fechado. |
| `src/components/contratos/ContratoJornadaAssinaturaBanner.tsx` | Banner e versão compacta reconhecem `document_closed` e ajustam rótulo visual. |
| `supabase/schema.sql` | Check constraint da tabela `contratos` atualizado para incluir `document_closed`. |
| `supabase/migrations/20260330113000_contratos_document_closed_status.sql` | Migration para atualizar constraint de status no banco. |

## Validação executada

- `npx tsc --noEmit`
- `npx vitest run src/lib/utils/contrato-listagem-assinaturas.test.ts src/lib/utils/contrato-link-signatario-client.test.ts src/components/eventos/EventoContratosSection.test.tsx`

## Observação operacional

É necessário aplicar a migration nova no banco para aceitar `document_closed` no Postgres. Sem isso, atualizações de status vão falhar por constraint.
