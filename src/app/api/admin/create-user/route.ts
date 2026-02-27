import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { requireAdminOrPremium } from '@/lib/api/route-helpers';

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

    return NextResponse.json({ 
      success: true, 
      message: 'Usuário criado com sucesso',
      user: userData
    });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    
    // Se o usuário já existe, retornar erro específico
    if (error.code === 'auth/email-already-in-use') {
      return NextResponse.json(
        { error: 'Este email já está em uso' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Erro ao criar usuário' },
      { status: 500 }
    );
  }
}

