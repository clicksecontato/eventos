# Melhorias na assinatura eletrônica (sem ICP-Brasil)

## Objetivo

Fortalecer o fluxo de **assinatura por link público** com OTP por e-mail, ciência obrigatória, integridade do documento (hash de referência), auditoria ampliada no PDF, transparência sobre a **não** qualificação ICP-Brasil e revogação de links pelo painel — **sem** implementar certificado digital, PAdES qualificado ou ICP-Brasil.

## Plano executado

1. **Banco (Supabase)** — novas colunas em `contratos_assinatura_convites` para contagem de acessos, OTP, bloqueio anti-abuso e hash de referência do contrato.
2. **Geração do link** — nome e e-mail obrigatórios; gravação de `contrato_ref_hash` no convite para invalidar o link se o PDF/metadados mudarem.
3. **API pública** — `GET` só entrega URL assinada do PDF após `otp_verificado_em`; rotas `enviar-codigo` e `verificar-codigo`; `POST assinar` exige ciência, e-mail alinhado ao convite (quando houver) e confirmação OTP quando aplicável.
4. **Revogação** — `POST /api/contratos/[id]/revogar-convite-assinatura` (autenticado) para cancelar convites `pendente` ou `acessado`.
5. **UI** — página pública com texto legal curto, fluxo OTP, checkbox de ciência; tela de contrato com botão para revogar links pendentes; modal de geração com campos obrigatórios.
6. **PDF** — texto explícito de que não é assinatura qualificada ICP-Brasil; linhas de auditoria com id do convite, modalidade e referência do documento.

## Arquivos alterados / novos

| Arquivo | Função |
|--------|--------|
| `supabase/migrations/20260326120000_contratos_assinatura_convites_seguranca.sql` | Migração das colunas de segurança e OTP. |
| `supabase/schema.sql` | Mesmas colunas documentadas (ALTER) para alinhar ao estado do banco. |
| `src/lib/services/assinatura-cliente-link-service.ts` | Hash de referência do contrato, OTP (6 dígitos), hash do código, máscara de e-mail, template de e-mail do código. |
| `src/lib/services/pdf-assinatura-service.ts` | Título “avançada” + linha de esclarecimento ICP-Brasil na página de assinatura do PDF. |
| `src/types/index.ts` | Campos opcionais em `AssinaturaAuditoriaContrato` (convite, modalidade, ciência, OTP, hash de referência). |
| `src/app/api/contratos/[id]/gerar-link-assinatura/route.ts` | Valida nome/e-mail; insere `contrato_ref_hash`. |
| `src/app/api/contratos/[id]/revogar-convite-assinatura/route.ts` | Revoga convites por contrato (opcionalmente por `conviteId`). |
| `src/app/api/assinatura/contrato/[token]/route.ts` | Integridade via hash; contador de acessos; bloqueio de PDF até OTP quando há e-mail no convite. |
| `src/app/api/assinatura/contrato/[token]/enviar-codigo/route.ts` | Envia OTP por e-mail com limites de intervalo e total de envios. |
| `src/app/api/assinatura/contrato/[token]/verificar-codigo/route.ts` | Valida código; bloqueio após tentativas falhas. |
| `src/app/api/assinatura/contrato/[token]/assinar/route.ts` | Ciência obrigatória; OTP quando aplicável; hash do contrato; auditoria enriquecida. |
| `src/app/assinatura/contrato/[token]/page.tsx` | Fluxo OTP + checkbox + texto de transparência. |
| `src/components/contratos/GerarLinkAssinaturaClienteDialog.tsx` | Nome e e-mail obrigatórios; texto explicando o código. |
| `src/app/contratos/[id]/page.tsx` | Botão “Revogar links pendentes”. |

## Pós-deploy

- Aplicar a migração no projeto Supabase (`supabase db push` ou fluxo equivalente).
- Convites antigos sem `contrato_ref_hash` ou sem e-mail continuam com comportamento legado (sem OTP obrigatório se não houver e-mail; sem checagem de hash se `contrato_ref_hash` for nulo).

## Manutenibilidade e próximos passos

A lógica de OTP e limites está concentrada nas rotas dedicadas e no serviço de link; o hash de referência evita assinar um PDF diverso do convite sem depender de ICP. Para escalar, vale extrair um pequeno módulo “política de convite” (rate limit por IP na borda, carimbo de tempo opcional, SMS) sem misturar com o fluxo interno de assinatura logada.
