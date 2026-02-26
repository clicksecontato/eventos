# Correção: Plano não cadastrado no PURCHASE_APPROVED (Hotmart)

## Problema

No webhook `PURCHASE_APPROVED` da Hotmart:
- O **cadastro do cliente** (Firebase Auth, Firestore `users`, Supabase) era feito corretamente.
- O **plano/assinatura** do cliente **não** era cadastrado (collection `assinaturas` no Firestore).

## Causa raiz

O `PlanoService.aplicarPlanoUsuario` (chamado em `processarCompra` para o evento `purchase` / `PURCHASE_APPROVED`) é quem:
1. Cria ou atualiza o documento em `assinaturas` (Firestore)
2. Chama `assinaturaService.sincronizarPlanoUsuario(userId)` para atualizar o campo `user.assinatura`

Nas rotas de webhook (`/api/webhooks/hotmart`, `/api/webhooks/hotmart/sandbox`, `/api/webhooks/hotmart/mock`), o `PlanoService` era instanciado apenas com `planoRepo`:

```ts
const planoService = new PlanoService(planoRepo);
```

Com isso, o construtor do `PlanoService` usava os **valores padrão** para os parâmetros não passados:
- `assinaturaRepo` → `new AssinaturaRepository()` (Firestore **client**)
- `assinaturaService` → `new AssinaturaService()` (repositórios **client**)

O SDK do Firestore no **cliente** obedece às regras de segurança. No contexto do servidor (API Route), não há `request.auth` do Firebase, então as escritas em `assinaturas` (e possivelmente em `users` via `sincronizarPlanoUsuario`) falhavam por **"Missing or insufficient permissions"** ou eram bloqueadas, e o plano não era persistido.

## Solução aplicada

Garantir que, no fluxo de webhook, o `PlanoService` use **repositórios Admin** (Firebase Admin SDK), que ignoram as regras do Firestore.

### Alteração

Em todas as rotas de webhook Hotmart, a criação do `PlanoService` passou a injetar `assinaturaRepo` (Admin) e `assinaturaService` (já construído com repositórios Admin):

**Antes:**
```ts
const planoService = new PlanoService(planoRepo);
```

**Depois:**
```ts
const planoService = new PlanoService(planoRepo, undefined, assinaturaRepo, undefined, assinaturaService);
```

Assim, `aplicarPlanoUsuario` utiliza:
- `this.assinaturaRepo` → `AdminAssinaturaRepository` (cria/atualiza `assinaturas`)
- `this.assinaturaService` → `AssinaturaService` com `AdminAssinaturaRepository`, `AdminPlanoRepository`, `AdminUserRepository` (para `sincronizarPlanoUsuario` em `users`)

### Arquivos modificados

- `src/app/api/webhooks/hotmart/route.ts` (POST e GET)
- `src/app/api/webhooks/hotmart/sandbox/route.ts` (POST e GET)
- `src/app/api/webhooks/hotmart/mock/route.ts` (POST)

## Fluxo após a correção (PURCHASE_APPROVED)

1. Hotmart envia `PURCHASE_APPROVED` para `/api/webhooks/hotmart`.
2. `processarWebhook` normaliza o evento para `purchase` e extrai `subscription`, `email`, `codigoPlano`, `hotmartSubscriptionId`.
3. Se o usuário não existir → `preCadastrarUsuario` (Firebase Auth + Firestore `users` + `syncFirebaseUserToSupabase`).
4. Busca do plano por `codigoHotmart` (mapeamento de `plan.id` Hotmart, ex.: `1196829` → `BASICO_MENSAL`).
5. `processarCompra` chama `planoService.aplicarPlanoUsuario(userId, planoId, hotmartSubscriptionId, subscription)`.
6. `aplicarPlanoUsuario`:
   - `assinaturaRepo.findByHotmartId` (Admin) → verifica se já existe assinatura.
   - Se não existe: `assinaturaRepo.create(dadosAssinatura)` (Admin) → cria em `assinaturas`.
   - Se existe: `assinaturaRepo.update(assinatura.id, dadosAssinatura)` (Admin).
   - `assinaturaService.sincronizarPlanoUsuario(userId)` (Admin) → atualiza `user.assinatura` no Firestore.

Com isso, o plano/assinatura passa a ser criado e a sincronização em `user.assinatura` ocorre corretamente no webhook `PURCHASE_APPROVED`.
