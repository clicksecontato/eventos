# Listagem /contratos — status por signatário

## Objetivo

Quando o contrato está `assinado` no banco mas ainda há signatários de partes sem assinar, a lista não deve parecer “concluída”: exibe **Colhendo assinaturas (x/y)** e uma lista com nome, e-mail, papel da parte e status individual.

## API

- `GET /api/contratos` passa a incluir `signatariosListagem` (array) por contrato, montado a partir de `listarArvorePorContrato` + flatten de signatários com `papelParte`.

## Tipos

- `ContratoSignatarioListagem` e `signatariosListagem?` opcional em `Contrato` (`src/types/index.ts`).

## Utilitário

- `src/lib/utils/contrato-listagem-assinaturas.ts` — `obterExibicaoStatusContratoNaLista`, `contratoPassaFiltroStatusLista`, rótulos de papel e de status do signatário.

## UI (`src/app/contratos/page.tsx`)

- Badge principal: âmbar para “colhendo”, azul para assinado completo (com ou sem signatários), demais iguais ao antes.
- Bloco **Signatários** quando `signatariosListagem.length > 0`.
- Por signatário: **Gerar link** (pendente / expirado / recusado) e **Copiar link** (convite enviado) chamam `POST .../gerar-link-assinatura` com `signatarioId`. “Copiar” gera novo token, copia para a área de transferência e invalida convites anteriores pendentes ou acessados daquele signatário.
- Filtro **Colhendo assinaturas**; **Assinado (todos)** = assinado no DB e não há pendência entre signatários cadastrados (ou contrato legado sem signatários).
- Botão **Baixar PDF** também para `status === 'assinado'` quando há `pdfUrl`.

## API (`gerar-link-assinatura`)

- Antes de inserir convite com `signatario_id`, revoga (`cancelado`) convites do mesmo contrato/signatário com status `pendente` ou `acessado`, permitindo renovar link sem duplicar ativos.

## Testes

- `src/lib/utils/contrato-listagem-assinaturas.test.ts`

## Observação

O campo `status` do contrato no Postgres não foi alterado; a distinção é derivada dos signatários para a listagem e filtros da página.
