# Correção: links de assinatura na lista (corrida + cópia)

## Problema

Na página de contrato e na lista `/contratos`, ao gerar/copiar link por signatário na **lista**, ocorria:

- Token já **cancelado** ao abrir o URL (corrida entre dois `POST` ao mesmo contrato).
- **Copiar link** às vezes não copiava (Clipboard API indisponível ou falha).

O botão superior que abre `GerarLinkAssinaturaClienteDialog` funcionava porque só há um fluxo serializado por uso manual.

## Causa raiz (lista)

1. **Corrida:** `POST /gerar-link-assinatura` revoga convites pendentes e cria outro. Dois pedidos em paralelo para o **mesmo contrato** (ex.: cliques rápidos em signatários diferentes) podem intercalar revogação/insert e invalidar o token devolvido por um dos responses.
2. **Cópia:** Só se usava `navigator.clipboard.writeText`; sem fallback para `document.execCommand('copy')`.

## Alterações

| Arquivo | Função |
|---------|--------|
| `src/components/contratos/ContratoSignatariosLinksLista.tsx` | Enquanto `linkAssinaturaChave` começa com `${contrato.id}:`, **todos** os botões Gerar/Copiar daquele contrato ficam desabilitados (não só a linha do signatário atual). |
| `src/components/contratos/ContratoPartesPanel.tsx` | Estado booleano `linkAssinaturaOperacaoEmAndamento` em vez de guardar só o `signatarioId` — bloqueia todos os botões de link do painel durante um `POST`. |
| `src/lib/utils/contrato-link-signatario-client.ts` | Nova `tentarCopiarParaAreaTransferencia`: clipboard + fallback textarea/execCommand; usada em modo `copiar` e ao copiar link após gerar sem e-mail. |
| `src/lib/utils/contrato-link-signatario-client.test.ts` | Testes ajustados para `execCommand` no jsdom + caso de fallback com sucesso. |

## Validação sugerida

1. Contrato com PDF + vários signatários: gerar link para A, aguardar fim; depois B; abrir ambos os URLs.
2. “Copiar link” em ambiente sem clipboard seguro (ou após simular falha): deve copiar via fallback ou mostrar o link no toast info.

## Manutenibilidade

A serialização no cliente reduz a corrida sem exigir lock no banco. Se no futuro houver muita concorrência (várias abas), um **advisory lock** ou transação única no Postgres poderia reforçar; para UX típica de um usuário na tela, bloquear por contrato/painel é suficiente.
