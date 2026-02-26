/**
 * Sincroniza usuários do Firebase (controle_users) para Supabase (users).
 *
 * Uso:
 *   npx tsx scripts/sincronizar-controle-users-supabase.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface ResultadoSync {
  total: number;
  migrados: number;
  erros: number;
}

function converterTimestamp(timestamp: any): string | null {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return null;
}

async function main() {
  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { createClient } = await import('@supabase/supabase-js');

  const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const FIREBASE_CLIENT_EMAIL = process.env.GOOGLE_CREDENTIALS_CLIENT_EMAIL;
  const FIREBASE_PRIVATE_KEY = process.env.GOOGLE_CREDENTIALS_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Variáveis do Firebase Admin não configuradas (GOOGLE_CREDENTIALS_* e NEXT_PUBLIC_FIREBASE_PROJECT_ID).');
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Variáveis do Supabase não configuradas (NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).');
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY
      })
    });
  }

  const db = getFirestore();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const resultado: ResultadoSync = { total: 0, migrados: 0, erros: 0 };

  console.log('Iniciando sincronização controle_users -> users...');
  const snapshot = await db.collection('controle_users').get();
  resultado.total = snapshot.size;

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const firebaseUid = doc.id;

      const payload = {
        id: firebaseUid,
        email: data.email || '',
        nome: data.nome || data.name || 'Usuário',
        role: data.role || 'user',
        ativo: data.ativo !== false,
        assinatura: data.assinatura || null,
        data_cadastro: converterTimestamp(data.dataCadastro || data.data_cadastro) || new Date().toISOString(),
        data_atualizacao: converterTimestamp(data.dataAtualizacao || data.data_atualizacao) || new Date().toISOString()
      };

      const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
      if (error) {
        resultado.erros++;
        console.error(`Erro ao migrar usuário ${firebaseUid}: ${error.message}`);
      } else {
        resultado.migrados++;
      }
    } catch (error: any) {
      resultado.erros++;
      console.error(`Erro ao processar usuário ${doc.id}: ${error?.message || error}`);
    }
  }

  console.log('\nSincronização concluída.');
  console.log(`Total no Firebase: ${resultado.total}`);
  console.log(`Migrados no Supabase: ${resultado.migrados}`);
  console.log(`Erros: ${resultado.erros}`);
}

main().catch((error) => {
  console.error('Falha na sincronização:', error);
  process.exit(1);
});

