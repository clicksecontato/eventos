# Correção: login NextAuth (401) — Firebase REST no servidor

## Problema

`signInWithEmailAndPassword` do SDK **web** executado dentro de `authorize` do NextAuth roda no **Node**. Nesse contexto o SDK costuma falhar com erro genérico de credencial, mesmo com e-mail/senha corretos no Firebase Auth.

## Solução

1. **`src/lib/utils/firebase-sign-in-password-rest.ts`** — chama `accounts:signInWithPassword` da Identity Toolkit (REST) com `NEXT_PUBLIC_FIREBASE_API_KEY`.
2. **`src/lib/auth-config.ts`** — usa o REST no lugar do SDK para autenticar; em seguida lê `controle_users/{uid}` preferindo **Firestore Admin** (`adminDb`) para não depender de `auth.currentUser` no SDK cliente (regras de segurança).

## Desenvolvimento

Em `NODE_ENV=development`, falhas do Firebase logam no terminal do `next dev`:

`[next-auth][authorize] Firebase: <código>` — ex.: `INVALID_PASSWORD`, `EMAIL_NOT_FOUND`, `USER_DISABLED`.

## Se ainda falhar

- **Restrição da API key** no Google Cloud: chave limitada a *referrers* de navegador pode bloquear `fetch` feito pelo servidor (sem `Referer`). Crie/usar chave adequada a chamadas de servidor ou sem restrição de referrer inadequada.
- Confirme `NEXT_PUBLIC_FIREBASE_API_KEY` e projeto iguais ao Console.

## Data

2026-03-28
