# Detalhe do contrato — Gerar / Copiar link por signatário (aba Partes)

## Objetivo

Replicar na página `/contratos/[id]` (aba **Partes**) a mesma lógica da lista `/contratos`:

- **Gerar link**: signatário em `pendente`, `expirado` ou `recusado`, com contrato `gerado` ou `assinado` e PDF disponível (`pdfPath`).
- **Copiar link**: signatário em `convite_enviado`, nas mesmas condições de contrato/PDF.
- Os botões aparecem mesmo com `somenteLeitura` (contrato `assinado`), para permitir reenvio enquanto houver signatários pendentes; **Remover** continua oculto em somente leitura.

## Arquivos

| Arquivo | Função |
|---------|--------|
| `src/lib/utils/contrato-link-signatario-client.ts` | `podeGerarLinkAssinaturaContrato`, `solicitarLinkAssinaturaSignatario` — fetch, toasts e clipboard compartilhados entre lista e painel. |
| `src/app/contratos/page.tsx` | Passa a importar o util (remove duplicação do corpo do `fetch` / toasts). |
| `src/components/contratos/ContratoPartesPanel.tsx` | Novas props `contratoStatus`, `contratoPdfPath`; por signatário, botões Gerar/Copiar com tooltips; estado de loading por `signatarioId`; após sucesso chama `carregar()`. |
| `src/app/contratos/[id]/page.tsx` | Repassa `contrato.status` e `contrato.pdfPath` ao painel. |
| `src/lib/utils/contrato-link-signatario-client.test.ts` | Vitest: `podeGerarLinkAssinaturaContrato`; `solicitarLinkAssinaturaSignatario` com `fetch` e `navigator.clipboard` mockados (HTTP erro, modos gerar/copiar, `resendMock`, rede, payload com/sem `data`). |

## Validação

- `npx tsc --noEmit` sem erros.
- `npx vitest run src/lib/utils/contrato-link-signatario-client.test.ts` — 12 testes passando.

## Manutenibilidade

Centralizar o fluxo de link no util evita divergência entre lista e detalhe. Os testes do util protegem o contrato da resposta da API e o comportamento de toasts/clipboard sem precisar renderizar React.
