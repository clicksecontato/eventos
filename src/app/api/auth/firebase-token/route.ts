import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { adminAuth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';

/**
 * API Route para obter um custom token do Firebase Admin
 * Isso permite que o cliente faça login no Firebase Auth usando o token customizado
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar se o usuário está autenticado no NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o Firebase Admin está inicializado
    if (!isFirebaseAdminInitialized() || !adminAuth) {
      console.error('[firebase-token] Firebase Admin não está inicializado');
      return NextResponse.json(
        { error: 'Firebase Admin não configurado' },
        { status: 500 }
      );
    }

    // Criar custom token para o usuário
    const customToken = await adminAuth.createCustomToken(session.user.id, {
      email: session.user.email,
      name: session.user.name,
      role: (session.user as any).role || 'user'
    });

    return NextResponse.json({ token: customToken });
  } catch (error: any) {
    console.error('[firebase-token] Erro ao criar custom token:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar token' },
      { status: 500 }
    );
  }
}

