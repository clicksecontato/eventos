# Assinatura por link com vários signatários

## Problema

Após o primeiro signatário assinar pelo link público, o contrato passava a `status = assinado`. A rota `POST /api/assinatura/contrato/[token]/assinar` bloqueava **qualquer** nova assinatura com `Contrato já assinado.`, impedindo o segundo signatário (ex.: empresa) mesmo com convite válido e `signatario_id` no convite.

## Solução

- Se o convite tem **`signatario_id`** (Fase 2 / partes): valida o registro em `contrato_parte_signatarios`; só bloqueia se **esse** signatário já está `assinado`. Contrato já `assinado` não impede.
- Se o convite **não** tem `signatario_id` (fluxo legado, um link “solto”): mantém o bloqueio quando o contrato já está assinado, com mensagem orientando a usar link vinculado a signatário cadastrado.

## Auditoria

`AssinaturaAuditoriaContrato` ganhou campo opcional `anterior` (mesmo tipo, encadeado) para preservar metadados da assinatura imediatamente anterior no JSON do contrato.

## Arquivos

- `src/app/api/assinatura/contrato/[token]/assinar/route.ts` — lógica condicional + encadeamento de auditoria.
- `src/app/api/contratos/[id]/gerar-link-assinatura/route.ts` — exige `signatarioId` quando há signatários cadastrados; bloqueia convite para quem já assinou.
- `src/components/contratos/GerarLinkAssinaturaClienteDialog.tsx` — UI só por signatário elegível quando aplicável.
- `src/types/index.ts` — `anterior?: AssinaturaAuditoriaContrato`.

## Link obrigatório por signatário cadastrado

Se o contrato tem **qualquer** registro em `contrato_parte_signatarios`, `POST .../gerar-link-assinatura` **exige** `signatarioId` (rejeita nome/e-mail manual). Assim todo convite público fica amarrado a um signatário, alinhado à regra “só assina quem ainda não assinou”. Também bloqueia gerar link para signatário com `status === 'assinado'`.

O diálogo `GerarLinkAssinaturaClienteDialog` só oferece seleção de signatário nesse caso (exclui já assinados da lista). Contratos **sem** signatários cadastrados continuam com fluxo manual (nome + e-mail).

## Observação operacional

Se o segundo link foi gerado **antes** da primeira assinatura, o `contrato_ref_hash` pode ficar inválido após o PDF mudar; nesse caso a API GET já responde pedindo novo convite. Após esta correção, convites gerados **com o PDF já atualizado** (após a primeira assinatura) seguem válidos para o próximo signatário.

## Manutenção

A assinatura interna (`POST /api/contratos/[id]/assinar-pdf`) ainda bloqueia se `status === 'assinado'`. Se no futuro a empresa assinar sempre pelo painel depois do cliente pelo link, avaliar alinhar essa rota à mesma regra (ex.: parte “contratante” com signatário interno).
