# Script: listar usuários Firebase Auth no terminal

## Objetivo

Diagnosticar login (`401` em `/api/auth/callback/credentials`) conferindo **qual projeto** o Admin SDK usa e **quais UIDs/emails** existem com provedor `password` vs `google.com`.

## Arquivo

| Caminho | Função |
|---------|--------|
| `scripts/listar-usuarios-firebase-auth.ts` | Carrega `.env` / `.env.local`, inicializa Firebase Admin (mesmas variáveis do app), pagina `listUsers` e imprime uid, email, disabled, emailVerified, providers. |
| `package.json` | Script npm `firebase:list-users`. |

## Uso

```bash
npm run firebase:list-users
```

Filtrar por trecho de e-mail:

```bash
npx tsx scripts/listar-usuarios-firebase-auth.ts --email gmail
```

## Pré-requisitos no `.env`

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- E uma credencial Admin: `FIREBASE_ADMIN_SDK_KEY` **ou** `FIREBASE_SERVICE_ACCOUNT_KEY` **ou** `GOOGLE_CREDENTIALS_CLIENT_EMAIL` + `GOOGLE_CREDENTIALS_PRIVATE_KEY` (+ opcional `GOOGLE_CREDENTIALS_PROJECT_ID`)

## Leitura do resultado

- **`providers=[password]`** — login do painel com e-mail/senha deve usar **esse** e-mail e a senha do Firebase Auth.
- **`providers=[google.com]`** — não há senha nativa; o fluxo atual só usa `signInWithEmailAndPassword` (não entra com “só Google” pelo formulário de credenciais).
- O **projeto** impresso deve ser o mesmo do Console onde você resetou a senha.

## Data

2026-03-28
