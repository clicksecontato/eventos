/**
 * Lista usuários do Firebase Authentication (projeto do .env) via Admin SDK.
 *
 * Uso:
 *   npx tsx scripts/listar-usuarios-firebase-auth.ts
 *   npx tsx scripts/listar-usuarios-firebase-auth.ts --email parcial
 *
 * Requer no .env (igual ao app): NEXT_PUBLIC_FIREBASE_PROJECT_ID e uma de:
 * FIREBASE_ADMIN_SDK_KEY (JSON) | FIREBASE_SERVICE_ACCOUNT_KEY (base64) | GOOGLE_CREDENTIALS_*
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { ServiceAccount } from 'firebase-admin/app';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

function inicializarFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Defina NEXT_PUBLIC_FIREBASE_PROJECT_ID no .env');
  }

  if (process.env.FIREBASE_ADMIN_SDK_KEY) {
    const sa = JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY) as ServiceAccount;
    return initializeApp({ credential: cert(sa), projectId });
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
    const sa = JSON.parse(json) as ServiceAccount;
    return initializeApp({ credential: cert(sa), projectId });
  }

  const privateKey = process.env.GOOGLE_CREDENTIALS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_CREDENTIALS_CLIENT_EMAIL;
  const pid = process.env.GOOGLE_CREDENTIALS_PROJECT_ID || projectId;
  if (privateKey && clientEmail) {
    const serviceAccount: ServiceAccount = {
      projectId: pid,
      privateKey,
      clientEmail
    };
    return initializeApp({ credential: cert(serviceAccount), projectId: pid });
  }

  throw new Error(
    'Credenciais Admin ausentes. Use FIREBASE_ADMIN_SDK_KEY, FIREBASE_SERVICE_ACCOUNT_KEY ou GOOGLE_CREDENTIALS_* no .env'
  );
}

function provedores(u: { providerData: { providerId: string; uid: string; email?: string }[] }): string {
  return u.providerData.map((p) => p.providerId).join(', ') || '(nenhum)';
}

async function main(): Promise<void> {
  const filtroEmail = process.argv.find((a) => a === '--email')
    ? process.argv[process.argv.indexOf('--email') + 1]?.toLowerCase()
    : undefined;

  const app = inicializarFirebaseAdmin();
  const auth = getAuth(app);

  console.log('Projeto (NEXT_PUBLIC_FIREBASE_PROJECT_ID):', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log('---');

  let pageToken: string | undefined;
  let total = 0;

  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      const email = u.email?.toLowerCase() ?? '';
      if (filtroEmail && !email.includes(filtroEmail)) {
        continue;
      }
      total++;
      const linha = [
        `uid=${u.uid}`,
        `email=${u.email ?? '(sem email)'}`,
        `disabled=${u.disabled}`,
        `emailVerified=${u.emailVerified}`,
        `providers=[${provedores(u)}]`
      ].join(' | ');
      console.log(linha);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  console.log('---');
  console.log(`Total listado${filtroEmail ? ` (filtro "${filtroEmail}")` : ''}: ${total}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
