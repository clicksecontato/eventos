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

## Validação

- `npx tsc --noEmit` sem erros.

## Manutenibilidade

Centralizar o fluxo de link no util evita divergência entre lista e detalhe. Próximo passo natural seria testes unitários leves do util (parse de resposta mockada) se a suíte já cobrir utils similares.
