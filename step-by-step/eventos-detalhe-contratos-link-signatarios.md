# Evento — seção Contratos: Gerar / Copiar link por signatário

## Objetivo

Na página `/eventos/[id]`, card **Contratos**, replicar a mesma lógica da lista `/contratos` e da aba Partes:

- **Gerar link**: signatário `pendente`, `expirado` ou `recusado`, com contrato `gerado` ou `assinado` e `pdfPath` (API já devolve `signatariosListagem` em `GET /api/contratos?eventoId=`).
- **Copiar link**: signatário `convite_enviado`, mesmas condições.
- Após ação bem-sucedida: `refetchContratos()` do hook `useContratosPorEvento`.

## Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/utils/contrato-listagem-assinaturas.ts` | Export de `classeChipStatusSignatarioListagem` (antes só na página de contratos). |
| `src/app/contratos/page.tsx` | Lista de contratos usa `ContratoSignatariosLinksLista`; chip de signatário via util `classeChipStatusSignatarioListagem`. |
| `src/components/contratos/ContratoSignatariosLinksLista.tsx` | Lista compartilhada de signatários + ações de link. |
| `src/components/eventos/EventoViewPage.tsx` | Estado `linkAssinaturaChave`; `solicitarLinkSignatarioNoEvento`; secção Contratos usa `ContratoSignatariosLinksLista`. |
| `src/app/eventos/[id]/page.tsx` | Re-export do `EventoViewPage` (rota `/eventos/[id]` mantida). |

## Validação sugerida

- `npx vitest run src/lib/utils/contrato-listagem-assinaturas.test.ts`
- Fluxo manual: evento com contrato gerado, partes/signatários; conferir Gerar e Copiar na seção Contratos.
