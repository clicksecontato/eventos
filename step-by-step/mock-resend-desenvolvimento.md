# Mock de envio de e-mail (Resend) em desenvolvimento

## Motivo

Sem domínio verificado no Resend, os envios falham. Com `RESEND_MOCK=true` o sistema **não** chama a API do Resend e trata o envio como sucesso, permitindo testar o fluxo de assinatura (OTP, PDF, canvas).

## Variável

| Variável       | Valor    | Efeito                                              |
|----------------|----------|-----------------------------------------------------|
| `RESEND_MOCK`  | `true`   | `sendEmail` retorna sucesso sem enviar; logs no servidor; OTP de assinatura retorna `codigoOtpDesenvolvimento` na API. |

Definir no `.env` local (não commitar produção com `true`).

## Arquivos

- `src/lib/services/resend-email-service.ts` — `isResendMockEnabled()`, atalho no `sendEmail`, `isEmailServiceConfigured()` considera mock como “ok”.
- `src/app/api/assinatura/contrato/[token]/enviar-codigo/route.ts` — log do OTP + campo `codigoOtpDesenvolvimento` na resposta.
- `src/app/api/contratos/[id]/gerar-link-assinatura/route.ts` — log do link quando mock; `emailEnviado` falso se mock; `resendMock` na resposta.
- `src/app/assinatura/contrato/[token]/page.tsx` — aviso amarelo com o código OTP em dev.
- `src/components/contratos/GerarLinkAssinaturaClienteDialog.tsx` / `src/app/contratos/[id]/page.tsx` — toast informando mock ao gerar link.

## Produção

Remover ou definir `RESEND_MOCK=false` e configurar domínio + `RESEND_API_KEY` no Resend.
