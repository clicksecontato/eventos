# Fase 1 implementada: auditoria de ciclo de vida do contrato

## Objetivo

Tabela **append-only** de eventos, serviço de registro tolerante a falha, hooks nas rotas principais e aba **Histórico** na página do contrato.

## Banco

- Migração: `supabase/migrations/20260327100000_contrato_eventos_auditoria.sql`
- Tabela `contrato_eventos_auditoria`: `id`, `contrato_id` (CASCADE ao excluir contrato), `user_id`, `actor_user_id` opcional, `tipo_evento`, `payload` JSONB, `criado_em`.
- Espelho em `supabase/schema.sql`.

## Tipos

- `src/types/index.ts`: `TipoEventoContratoAuditoria`, interface `ContratoEventoAuditoria`.

## Repositório e serviço

- `src/lib/repositories/supabase/contrato-evento-auditoria-supabase-repository.ts` — `inserir`, `listarPorContrato` (service role).
- `src/lib/services/contrato-auditoria-service.ts` — `registrarEventoAuditoriaContrato` (erros só em log).
- `repositoryFactory.getContratoEventoAuditoriaRepository()`.

## API

- `GET /api/contratos/[id]/eventos-auditoria` — lista eventos do tenant autenticado.

## Onde os eventos são registrados

| Evento | Origem |
|--------|--------|
| `contrato_criado` | `POST /api/contratos` |
| `conteudo_alterado` | `PUT /api/contratos/[id]` se `conteudoHtml` no body |
| `metadados_alterados` | `PUT` com `dadosPreenchidos`, `observacoes`, `eventoId` ou `modeloContratoId` |
| `status_alterado` | `PUT` quando `status` muda |
| `pdf_gerado` | `POST .../gerar-pdf` após atualizar contrato |
| `assinado_interno` | `POST .../assinar-pdf` |
| `assinado_link_publico` | `POST /api/assinatura/contrato/[token]/assinar` |
| `convite_link_criado` | `POST .../gerar-link-assinatura` |
| `convites_revogados` | `POST .../revogar-convite-assinatura` (se `revogados > 0`) |

**Nota:** exclusão do contrato remove o histórico em cascata; não há evento `contrato_excluido` persistido.

## UI

- `src/app/contratos/[id]/page.tsx` — aba **Histórico**, lista com rótulos em PT-BR e JSON do payload.

## Próximos passos (Fase 2+)

- Partes e múltiplos signatários conforme `plano-multiplas-partes-assinaturas-auditoria-contratos.md`.
