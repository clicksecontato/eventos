import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { email, password, nome, role = 'user' } = await request.json();

    if (!email || !password || !nome) {
      return NextResponse.json(
        { error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
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
      role: role || 'user',
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

