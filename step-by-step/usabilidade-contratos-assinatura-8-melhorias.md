# Usabilidade — 8 melhorias no fluxo de contratos e assinatura

## Resumo

Implementação das melhorias sugeridas para jornada guiada, fluxo único de “gerar link”, cabeçalho menos carregado, lista de signatários colapsável, CTA na aba Partes, estados vazios, histórico filtrável e feedback pós-geração (cópia + diálogo “Abrir em nova aba”).

## Arquivos novos

| Arquivo | Função |
|---------|--------|
| `src/components/contratos/ContratoJornadaAssinaturaBanner.tsx` | Checklist “Próximos passos” (PDF, partes opcional, progresso de assinaturas) + CTAs. |
| `src/components/contratos/LinkGeradoSucessoDialog.tsx` | Após gerar link: copiar novamente, abrir em nova aba, fechar. |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `GerarLinkAssinaturaClienteDialog.tsx` | `signatarioIdInicial`, `avisoRenovarConviteAnterior` (fluxo “Copiar link”). |
| `ContratoSignatariosLinksLista.tsx` | `onAbrirDialogGerarLink` vs `onSolicitarLink`; `bloquearAcoes`; colapsar se &gt; 2 signatários; `aria-label` nos botões. |
| `ContratoPartesPanel.tsx` | `onPedidoAbrirGerarLink`, `bloquearBotoesLink`, CTA “Pronto para enviar?”. |
| `src/app/contratos/[id]/page.tsx` | Banner; menu **Assinatura** (dropdown); histórico com filtros + resumo dos 5 últimos; cartão rascunho sem PDF; integração modais + `tentarCopiarParaAreaTransferencia`. |
| `src/app/contratos/page.tsx` | Lista: modal unificado; `LinkGeradoSucessoDialog`; tooltips “Abrir contrato”; `aria-label` nos ícones. |
| `EventoViewPage.tsx` / `EventoContratosSection.tsx` | Mesmo padrão de modal na seção de contratos do evento. |
| Testes `EventoContratosSection.test.tsx`, `EventoViewPage.test.tsx` | Props e mocks dos novos diálogos. |

## Validação

- `npx vitest run src/components/eventos/ src/lib/utils/contrato-link-signatario-client.test.ts`
- `npx tsc --noEmit`

## Lista `/contratos` — jornada compacta (iteração)

- `ContratoJornadaAssinaturaCompacta` em `ContratoJornadaAssinaturaBanner.tsx`: bloco por card com resumo (PDF / signatários / progresso) e botões **Gerar PDF**, **Abrir Partes** (`/contratos/[id]?aba=partes`), **Gerar link** (abre o mesmo modal).
- Estado `gerandoPdfContratoId` na página de listagem para desabilitar só o botão do contrato em geração.
- Detalhe do contrato: query `?aba=partes` | `editar` | `historico` | `visualizar` aplicada uma vez ao carregar o contrato (`useSearchParams` + `useRef`).

## Manutenção

O fluxo de link concentra-se no `GerarLinkAssinaturaClienteDialog`; listas e Partes apenas abrem o modal com contexto (`signatarioIdInicial`, aviso de renovação). Evita divergência entre POST direto e modal em telas principais; o fallback por `onSolicitarLink` permanece na lista para testes ou usos pontuais.
