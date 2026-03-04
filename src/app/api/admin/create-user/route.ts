import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { requireAdminOrPremium } from '@/lib/api/route-helpers';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const usuarioAutenticado = await requireAdminOrPremium();
    const { email, password, nome, role = 'user' } = await request.json();
    const roleNormalizado = role === 'admin' ? 'admin' : 'user';

    if (!email || !password || !nome) {
      return NextResponse.json(
        { error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
      );
    }

    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json(
        { error: 'Role inválido. Valores permitidos: admin ou user.' },
        { status: 400 }
      );
    }

    // Conta PREMIUM_MENSAL pode criar usuários, mas não promover para admin.
    if (usuarioAutenticado.role !== 'admin' && roleNormalizado === 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem criar contas com role admin.' },
        { status: 403 }
      );
    }

    // Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Criar documento do usuário no Firestore
    const userData = {
      id: user.uid,
      nome,
      email,
      role: roleNormalizado,
      ativo: true,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    };

    await setDoc(doc(db, 'controle_users', user.uid), userData);

    // Vincular assinatura/plano padrão automaticamente:
    // - user  -> BASICO_MENSAL
    // - admin -> PREMIUM_MENSAL
    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const assinaturaService = getServiceFactory().getAssinaturaService();
    const resultadoAssinatura = await assinaturaService.atualizarStatusAssinaturaUsuario(
      user.uid,
      'active',
      {
        origem: 'admin_create_user',
        criadoPor: usuarioAutenticado.id,
        roleNovoUsuario: roleNormalizado
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Usuário criado com sucesso e vinculado ao plano padrão do perfil',
      user: userData,
      planoAtribuido: {
        planoCodigo: resultadoAssinatura.user.assinatura?.planoCodigoHotmart || null,
        planoNome: resultadoAssinatura.user.assinatura?.planoNome || null
      }
    });
  } catch (error: unknown) {
    console.error('Erro ao criar usuário:', error);
    
    // Se o usuário já existe, retornar erro específico
    if (getErrorCode(error) === 'auth/email-already-in-use') {
      return NextResponse.json(
        { error: 'Este email já está em uso' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: getErrorMessage(error) || 'Erro ao criar usuário' },
      { status: 500 }
    );
  }
}

