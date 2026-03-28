import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import {
  isDevAuthBypassAtivo,
  obterUsuarioBypassDesenvolvimento,
  senhaBypassCredentialsEfetiva
} from './utils/dev-auth-bypass';
import { firebaseSignInWithPasswordRest } from './utils/firebase-sign-in-password-rest';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        if (isDevAuthBypassAtivo()) {
          const senhaOk =
            credentials.password === senhaBypassCredentialsEfetiva();
          const alvo = obterUsuarioBypassDesenvolvimento();
          const emailOk =
            credentials.email.trim().toLowerCase() ===
            (alvo.email || '').toLowerCase();
          if (senhaOk && emailOk) {
            return {
              id: alvo.id,
              email: alvo.email,
              name: alvo.name,
              role: (alvo.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user'
            };
          }
        }

        // Verificar se o Firebase está configurado
        const isFirebaseConfigured = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                                     process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

        if (isFirebaseConfigured) {
          try {
            // REST Identity Toolkit no servidor (o SDK web no Node costuma falhar com credencial inválida genérica)
            const sessao = await firebaseSignInWithPasswordRest(
              credentials.email,
              credentials.password
            );

            let nome = sessao.displayName || 'Usuário';
            let role: 'admin' | 'user' = 'user';

            const firebaseAdmin = await import('./firebase-admin');
            const adminDb = firebaseAdmin.adminDb;
            if (firebaseAdmin.isFirebaseAdminInitialized() && adminDb) {
              const snap = await adminDb
                .collection('controle_users')
                .doc(sessao.localId)
                .get();
              const userData = snap.data();
              if (userData) {
                nome = (userData.nome as string) || nome;
                role = userData.role === 'admin' ? 'admin' : 'user';
              }
            } else {
              const { db } = await import('./firebase');
              const { doc, getDoc } = await import('firebase/firestore');
              const userDoc = await getDoc(doc(db, 'controle_users', sessao.localId));
              const userData = userDoc.data();
              if (userData) {
                nome = (userData.nome as string) || nome;
                role = (userData.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user';
              }
            }

            try {
              const { syncFirebaseUserToSupabase } = await import('./utils/sync-firebase-user-to-supabase');
              await syncFirebaseUserToSupabase(sessao.localId, sessao.email, nome, role);
            } catch {
              // sync opcional
            }

            return {
              id: sessao.localId,
              email: sessao.email,
              name: nome,
              role: role
            };
          } catch (error) {
            const code = (error as Error & { firebaseCode?: string })?.firebaseCode ?? (error as Error)?.message;
            if (process.env.NODE_ENV === 'development') {
              console.warn('[next-auth][authorize] Firebase:', code);
            }
            return null;
          }
        } else {
          // Fallback para usuários de desenvolvimento (quando Firebase não estiver configurado)
          
          if (credentials?.email === 'admin@clickse.com' && credentials?.password.length >= 3) {
            return {
              id: '1',
              email: 'admin@clickse.com',
              name: 'Administrador',
              role: 'admin'
            };
          }
          
          if (credentials?.email === 'user@clickse.com' && credentials?.password.length >= 3) {
            return {
              id: '2',
              email: 'user@clickse.com',
              name: 'Usuário Teste',
              role: 'user'
            };
          }
          
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
