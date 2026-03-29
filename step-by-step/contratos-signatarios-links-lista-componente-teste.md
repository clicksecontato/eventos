# ContratoSignatariosLinksLista + Vitest + EventoViewPage

## Objetivo

- Extrair lista de signatários com **Gerar link** / **Copiar link** para `ContratoSignatariosLinksLista`, usada em `/contratos` e na tela de detalhe do evento (`EventoViewPage`).
- Corrigir testes do detalhe do evento: Vitest 4 + `tsconfig` com `jsx: "preserve"` quebrava o plugin `import-analysis` em `.tsx` sem transform JSX adequado.

## Arquivos

| Arquivo | Função |
|---------|--------|
| `src/components/contratos/ContratoSignatariosLinksLista.tsx` | Props: `contrato`, `linkAssinaturaChave`, `onSolicitarLink`, `classNameUl?`. Um `TooltipProvider` envolvendo a lista. |
| `src/app/contratos/page.tsx` | Usa o componente; removidos imports só usados nesse bloco. |
| `src/components/eventos/EventoViewPage.tsx` | Conteúdo que estava em `app/eventos/[id]/page.tsx` (rota inalterada para o utilizador). |
| `src/app/eventos/[id]/page.tsx` | Re-export `'use client'` → `EventoViewPage`. |
| `src/components/eventos/EventoViewPage.test.tsx` | Testes migrados; mocks com `React.createElement`; mock de `ContratoSignatariosLinksLista` como `null`; alocações mock com `inicioTs`/`fimTs` como `Date`. |
| `vitest.config.ts` | `plugins: [react()]` via `@vitejs/plugin-react` para JSX nos testes e nos módulos importados. |
| `package.json` | `devDependency` `@vitejs/plugin-react`. |

## Removidos

- `src/app/eventos/evento-view-page.test.tsx` e `src/app/eventos/[id]/page.test.tsx` (substituídos por teste junto ao componente).

## Validação

- `npx vitest run src/components/eventos/EventoViewPage.test.tsx`
- `npx vitest run src/app/contratos/page.test.tsx`
- `npx tsc --noEmit`

## Manutenibilidade

O componente de links concentra regras de exibição (`podeGerarLinkAssinaturaContrato` + status do signatário). O plugin React no Vitest alinha o bundle de testes ao ecossistema React/TSX sem mudar o `jsx` do Next em `tsconfig.json`.
