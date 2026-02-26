'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface FirebaseAuthProviderProps {
  children: React.ReactNode;
}

/**
 * Provider que sincroniza o Firebase Auth com o NextAuth
 * Garante que quando o usuário está autenticado no NextAuth,
 * também está autenticado no Firebase Auth (necessário para as regras de segurança do Firestore)
 */
export function FirebaseAuthProvider({ children }: FirebaseAuthProviderProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se o Firebase está configurado
    const isFirebaseConfigured = 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!isFirebaseConfigured) {
      return;
    }

    const syncFirebaseAuth = async () => {
      // Aguardar a sessão do NextAuth estar pronta
      if (status === 'loading') {
        return;
      }

      // Se não estiver autenticado no NextAuth, fazer logout do Firebase Auth
      if (status === 'unauthenticated' || !session?.user?.id) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            await firebaseSignOut(auth);
          } catch (err) {
            // Erro silencioso
          }
        }
        return;
      }

      // Se já estiver autenticado no Firebase Auth com o mesmo usuário, não fazer nada
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === session.user.id) {
        return;
      }

      // Se estiver autenticado no NextAuth mas não no Firebase Auth, fazer login
      if (status === 'authenticated' && session?.user?.id) {
        // Se já estiver autenticado com outro usuário, fazer logout primeiro
        if (currentUser && currentUser.uid !== session.user.id) {
          try {
            await firebaseSignOut(auth);
          } catch (err) {
            // Erro silencioso
          }
        }

        setIsSyncing(true);
        setError(null);

        try {
          // Obter custom token do servidor
          const response = await fetch('/api/auth/firebase-token');
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            throw new Error(errorData.error || 'Erro ao obter token do Firebase');
          }

          const { token } = await response.json();

          // Fazer login no Firebase Auth usando o custom token
          await signInWithCustomToken(auth, token);
        } catch (err: any) {
          setError(err.message || 'Erro ao sincronizar Firebase Auth');
        } finally {
          setIsSyncing(false);
        }
      }
    };

    syncFirebaseAuth();

    // Monitorar mudanças no estado de autenticação do Firebase
    // Apenas logar se estiver em uma página que requer autenticação
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Não logar em páginas públicas (esqueci-senha, redefinir-senha, login, etc)
      const publicRoutes = ['/esqueci-senha', '/redefinir-senha', '/login', '/painel', '/'];
      const isPublicRoute = pathname && publicRoutes.some(route => pathname.startsWith(route));
      
      // Estado de autenticação monitorado silenciosamente
    });

    return () => {
      unsubscribe();
    };
  }, [session, status, pathname]);

  // Não renderizar nada, apenas sincronizar em background
  return <>{children}</>;
}

