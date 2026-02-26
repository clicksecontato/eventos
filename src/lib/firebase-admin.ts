import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin/app';

let adminApp: App | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let adminDb: ReturnType<typeof getFirestore> | null = null;
let initializationError: Error | null = null;

// Inicializar Firebase Admin apenas se não estiver inicializado
if (getApps().length === 0) {
  try {
    console.log('[firebase-admin] Iniciando inicialização do Firebase Admin...');
    
    // Verificar se há credenciais configuradas
    const hasFirebaseAdminSdkKey = !!process.env.FIREBASE_ADMIN_SDK_KEY;
    const hasFirebaseServiceAccountKey = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const hasGoogleCredentials = !!process.env.GOOGLE_CREDENTIALS_CLIENT_EMAIL && !!process.env.GOOGLE_CREDENTIALS_PRIVATE_KEY;
    const hasProjectId = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    console.log('[firebase-admin] Verificando configuração:');
    console.log('[firebase-admin] - FIREBASE_ADMIN_SDK_KEY:', hasFirebaseAdminSdkKey ? '✓ configurada' : '✗ não configurada');
    console.log('[firebase-admin] - FIREBASE_SERVICE_ACCOUNT_KEY:', hasFirebaseServiceAccountKey ? '✓ configurada' : '✗ não configurada');
    console.log('[firebase-admin] - GOOGLE_CREDENTIALS_*:', hasGoogleCredentials ? '✓ configurada' : '✗ não configurada');
    console.log('[firebase-admin] - NEXT_PUBLIC_FIREBASE_PROJECT_ID:', hasProjectId ? `✓ ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}` : '✗ não configurada');
    
    // Tentar usar credenciais do service account se disponível
    if (hasFirebaseAdminSdkKey) {
      console.log('[firebase-admin] Usando FIREBASE_ADMIN_SDK_KEY...');
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY!);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        });
        console.log('[firebase-admin] ✅ Firebase Admin inicializado com FIREBASE_ADMIN_SDK_KEY');
      } catch (parseError: any) {
        console.error('[firebase-admin] ❌ Erro ao fazer parse do FIREBASE_ADMIN_SDK_KEY:', parseError.message);
        throw new Error(`Erro ao fazer parse do FIREBASE_ADMIN_SDK_KEY: ${parseError.message}`);
      }
    } else if (hasFirebaseServiceAccountKey) {
      console.log('[firebase-admin] Usando FIREBASE_SERVICE_ACCOUNT_KEY...');
      try {
        const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, 'base64').toString());
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        });
        console.log('[firebase-admin] ✅ Firebase Admin inicializado com FIREBASE_SERVICE_ACCOUNT_KEY');
      } catch (parseError: any) {
        console.error('[firebase-admin] ❌ Erro ao fazer parse do FIREBASE_SERVICE_ACCOUNT_KEY:', parseError.message);
        throw new Error(`Erro ao fazer parse do FIREBASE_SERVICE_ACCOUNT_KEY: ${parseError.message}`);
      }
    } else if (hasGoogleCredentials) {
      console.log('[firebase-admin] Usando GOOGLE_CREDENTIALS_* (variáveis individuais)...');
      try {
        // Construir objeto serviceAccount a partir das variáveis GOOGLE_CREDENTIALS_*
        // Validar propriedades obrigatórias
        const privateKey = process.env.GOOGLE_CREDENTIALS_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const clientEmail = process.env.GOOGLE_CREDENTIALS_CLIENT_EMAIL;
        const projectId = process.env.GOOGLE_CREDENTIALS_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        
        if (!privateKey || !clientEmail || !projectId) {
          throw new Error('Propriedades obrigatórias ausentes: GOOGLE_CREDENTIALS_PRIVATE_KEY, GOOGLE_CREDENTIALS_CLIENT_EMAIL ou project_id');
        }
        
        // Construir objeto no formato ServiceAccount (camelCase)
        const serviceAccount: ServiceAccount = {
          projectId: projectId,
          privateKey: privateKey,
          clientEmail: clientEmail,
          ...(process.env.GOOGLE_CREDENTIALS_PRIVATE_KEY_ID && { privateKeyId: process.env.GOOGLE_CREDENTIALS_PRIVATE_KEY_ID }),
          ...(process.env.GOOGLE_CREDENTIALS_CLIENT_ID && { clientId: process.env.GOOGLE_CREDENTIALS_CLIENT_ID }),
          ...(process.env.GOOGLE_CREDENTIALS_AUTH_URI && { authUri: process.env.GOOGLE_CREDENTIALS_AUTH_URI }),
          ...(process.env.GOOGLE_CREDENTIALS_TOKEN_URI && { tokenUri: process.env.GOOGLE_CREDENTIALS_TOKEN_URI }),
          ...(process.env.GOOGLE_CREDENTIALS_AUTH_PROVIDER_X509_CERT_URL && { authProviderX509CertUrl: process.env.GOOGLE_CREDENTIALS_AUTH_PROVIDER_X509_CERT_URL }),
          ...(process.env.GOOGLE_CREDENTIALS_CLIENT_X509_CERT_URL && { clientX509CertUrl: process.env.GOOGLE_CREDENTIALS_CLIENT_X509_CERT_URL }),
          ...(process.env.GOOGLE_CREDENTIALS_UNIVERSE_DOMAIN && { universeDomain: process.env.GOOGLE_CREDENTIALS_UNIVERSE_DOMAIN })
        };
        
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId
        });
        console.log('[firebase-admin] ✅ Firebase Admin inicializado com GOOGLE_CREDENTIALS_*');
      } catch (configError: any) {
        console.error('[firebase-admin] ❌ Erro ao configurar com GOOGLE_CREDENTIALS_*:', configError.message);
        throw new Error(`Erro ao configurar Firebase Admin com GOOGLE_CREDENTIALS_*: ${configError.message}`);
      }
    } else {
      // NÃO tentar usar Application Default Credentials em ambiente local
      // Isso causa erro "ENOTFOUND metadata.google.internal"
      const errorMessage = 'Firebase Admin não pode ser inicializado: credenciais não configuradas. Configure FIREBASE_ADMIN_SDK_KEY, FIREBASE_SERVICE_ACCOUNT_KEY ou GOOGLE_CREDENTIALS_* nas variáveis de ambiente.';
      console.error('[firebase-admin] ❌', errorMessage);
      initializationError = new Error(errorMessage);
      throw initializationError;
    }
    
    if (adminApp) {
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);
      console.log('[firebase-admin] ✅ Serviços do Firebase Admin inicializados com sucesso');
    }
  } catch (error: any) {
    console.error('[firebase-admin] ❌ Erro ao inicializar Firebase Admin:');
    console.error('[firebase-admin] Tipo:', error?.constructor?.name);
    console.error('[firebase-admin] Mensagem:', error?.message);
    console.error('[firebase-admin] Stack:', error?.stack);
    initializationError = error;
    // Não inicializar se houver erro - as funções que usam admin falharão com erro claro
  }
} else {
  console.log('[firebase-admin] Firebase Admin já está inicializado');
  adminApp = getApps()[0];
  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
}

// Função helper para verificar se o Firebase Admin está inicializado
export function isFirebaseAdminInitialized(): boolean {
  return adminApp !== null && adminAuth !== null && adminDb !== null;
}

// Função helper para obter erro de inicialização
export function getFirebaseAdminInitializationError(): Error | null {
  return initializationError;
}

export { adminAuth, adminDb };

