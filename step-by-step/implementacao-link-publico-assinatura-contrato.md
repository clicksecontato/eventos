# Implementação — link público para cliente assinar contrato

## Objetivo

Permitir que o cliente final (sem conta no sistema) receba um link, visualize o PDF e assine externamente. O PDF assinado permanece vinculado à conta do dono.

## O que foi criado

- Tabela de convites públicos de assinatura:
  - `contratos_assinatura_convites`
  - migration: `supabase/migrations/20260326060000_contratos_assinatura_link_publico.sql`
  - também refletida em `supabase/schema.sql`

- Serviço utilitário:
  - `src/lib/services/assinatura-cliente-link-service.ts`
  - gera token, hash SHA-256 do token, expiração e template de e-mail

- APIs:
  - `POST /api/contratos/[id]/gerar-link-assinatura`
    - autenticado (dono da conta)
    - gera token/convite, devolve link e envia e-mail opcional
  - `GET /api/assinatura/contrato/[token]`
    - público
    - valida token, expiração, status, retorna URL assinada do PDF
  - `POST /api/assinatura/contrato/[token]/assinar`
    - público
    - recebe assinatura PNG, incorpora no PDF com `pdf-lib`, salva no S3 e atualiza contrato para `assinado`

- Página pública:
  - `src/app/assinatura/contrato/[token]/page.tsx`
  - carrega contrato via token, exibe PDF, coleta nome/e-mail e assinatura (canvas), confirma assinatura

- Painel do dono:
  - `src/app/contratos/[id]/page.tsx`
  - botão `Gerar link para cliente` com modal padrão do projeto
  - componente: `src/components/contratos/GerarLinkAssinaturaClienteDialog.tsx`
  - coleta nome/e-mail no modal e mantém cópia do link para área de transferência

## Fluxo

1. Dono gera link no detalhe do contrato (status `gerado`).
2. Cliente acessa `/assinatura/contrato/{token}` sem autenticação.
3. Cliente assina no canvas e confirma.
4. Sistema grava PDF assinado no S3 e marca contrato como `assinado`.

## Observações

- Token salvo como **hash** no banco (`token_hash`), não em texto puro.
- Expiração padrão: 72h (ajustável via payload do endpoint).
- Para o fluxo funcionar no ambiente, é necessário aplicar a migration no Supabase e recarregar schema cache (`NOTIFY pgrst, 'reload schema';`).

