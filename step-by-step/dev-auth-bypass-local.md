# Bypass de autenticação em desenvolvimento local

## Objetivo

Permitir testar o app (ex.: contratos) sem login real no Firebase: APIs respondem como se o usuário configurado existisse, com plano simulado **PREMIUM_MENSAL** e permissões liberadas para o `userId` de bypass.

## Variáveis de ambiente

Ative **apenas** em máquina local com `NODE_ENV=development`.

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DEV_AUTH_BYPASS` | Sim (valor `true`) | Liga o bypass no servidor (`getAuthenticatedUser`, serviços de plano). |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | Para a UI | `true` dispara login automático via Credentials (alinha `useSession` com as APIs). |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS_EMAIL` | Opcional | Email usado no `signIn` client; deve bater com `DEV_AUTH_BYPASS_EMAIL`. Padrão: `kontempler@gmail.com`. |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS_USER_ID` | Opcional | Se definido, o cliente só aplica bypass de plano para esse UID. Se omitido, no browser qualquer usuário autenticado com `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` passa nas checagens locais do `DataService` (útil quando só existe `DEV_AUTH_BYPASS_USER_ID` no servidor). |
| `DEV_AUTH_BYPASS_USER_ID` | Recomendado | UID Firebase do usuário dono dos dados no Supabase. Padrão no código: UID de referência; **ajuste** para o seu tenant. |
| `DEV_AUTH_BYPASS_EMAIL` | Opcional | Padrão `kontempler@gmail.com`. |
| `DEV_AUTH_BYPASS_NAME` | Opcional | Nome exibido na sessão. |
| `DEV_AUTH_BYPASS_ROLE` | Opcional | `user` ou `admin`. Padrão `user` (plano ainda é simulado como premium). |
| `DEV_AUTH_BYPASS_PASSWORD` | Opcional | Senha do fluxo Credentials; cliente usa constante `__dev_bypass_clickse__` — se mudar aqui, alinhe com `src/lib/constants/dev-bypass-credenciais.ts` ou o signIn falha. |
| `DEV_AUTH_BYPASS_ACESSO_ADMIN` | Opcional | `false` para exigir `role === 'admin'` real nas rotas `requireAdmin`. Padrão: liberado no bypass (acesso total local). |

## Arquivos criados ou alterados

- `src/lib/constants/dev-bypass-credenciais.ts` — senha pública fixa do fluxo Credentials em dev (combinada com `DEV_AUTH_BYPASS` no servidor).
- `src/lib/utils/dev-auth-bypass.ts` — flags, usuário sintético e helpers.
- `src/lib/api/route-helpers.ts` — `getAuthenticatedUser`, `requireAdmin`, `requireAdminOrPremium` respeitam o bypass.
- `src/lib/auth-config.ts` — `authorize` aceita email/senha de bypass sem Firebase.
- `src/components/providers/DevAuthBootstrap.tsx` — `signIn` automático quando `NEXT_PUBLIC_DEV_AUTH_BYPASS=true`.
- `src/components/providers/SessionProvider.tsx` — monta o bootstrap dentro do NextAuth.
- `src/lib/services/assinatura-service.ts` — status de plano e validações simulados para o `userId` de bypass.
- `src/lib/services/funcionalidade-service.ts` — permissões e limites amplos para o `userId` de bypass.
- `src/lib/middleware/plano-validation.ts` — `withPlanoValidation` usa `getAuthenticatedUser` (herda bypass).
- `.env.empty` — exemplos comentados das variáveis.

## Criar evento com bypass (março/2026)

O `DataService.createEvento` valida plano no **cliente** chamando `FuncionalidadeService.verificarPodeCriar`. No bundle do browser, `DEV_AUTH_BYPASS` não existe (só `NEXT_PUBLIC_*`), então o bypass ficava desligado só nesse fluxo — as APIs `/api/plano/*` funcionavam, mas o submit do formulário falhava. Correção: `isDevAuthBypassAtivo()` usa `NEXT_PUBLIC_DEV_AUTH_BYPASS` no `window` e o ID do usuário de bypass aceita `NEXT_PUBLIC_DEV_AUTH_BYPASS_USER_ID` para alinhar com a sessão.

## Segurança

- Só ativa com `NODE_ENV === 'development'` **e** `DEV_AUTH_BYPASS === 'true'`.
- Não commitar `.env` com bypass ligado em timeplos compartilhados se houver risco de deploy acidental; preferir variáveis só na máquina local.

## Escalabilidade e manutenção

A lógica ficou centralizada em `dev-auth-bypass.ts` e no `getAuthenticatedUser`, evitando espalhar `if (dev)` em dezenas de rotas. Serviços de domínio (`AssinaturaService`, `FuncionalidadeService`) tratam o bypass só para o `userId` configurado, mantendo o restante do multi-tenant intacto. Próximo passo opcional: extrair mocks de plano para um único “provedor de contexto de assinatura fake” se surgirem mais cenários de demo local.
