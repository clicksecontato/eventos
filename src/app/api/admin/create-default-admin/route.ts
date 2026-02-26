import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const adminEmail = 'admin@clickse.com';
    const adminPassword = '123456';
    const adminNome = 'Administrador';

    // Verificar se o usuário admin já existe
    try {
      // Tentar fazer login primeiro para verificar se existe
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      
      // Se chegou aqui, o usuário existe, verificar se está no Firestore
      const adminUser = auth.currentUser;
      if (adminUser) {
        const userDoc = await getDoc(doc(db, 'controle_users', adminUser.uid));
        
        if (userDoc.exists()) {
          // Atualizar role para admin se não for
          const userData = userDoc.data();
          if (userData.role !== 'admin') {
            await setDoc(doc(db, 'controle_users', adminUser.uid), {
              ...userData,
              role: 'admin',
              dataAtualizacao: new Date()
            }, { merge: true });
          }
          
          return NextResponse.json({ 
            success: true, 
            message: 'Usuário admin já existe e está configurado corretamente',
            user: { ...userData, id: adminUser.uid, role: 'admin' }
          });
        } else {
          // Criar documento no Firestore
          const userData = {
            id: adminUser.uid,
            nome: adminNome,
            email: adminEmail,
            role: 'admin',
            ativo: true,
            dataCadastro: new Date(),
            dataAtualizacao: new Date()
          };

          await setDoc(doc(db, 'controle_users', adminUser.uid), userData);
          
          return NextResponse.json({ 
            success: true, 
            message: 'Usuário admin encontrado e documento criado no Firestore',
            user: userData
          });
        }
      }
    } catch (loginError: any) {
      // Se o erro for diferente de "user not found", relançar
      if (loginError.code !== 'auth/user-not-found' && loginError.code !== 'auth/wrong-password') {
        throw loginError;
      }
    }

    // Se chegou aqui, o usuário não existe, criar
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;

    // Criar documento do usuário no Firestore
    const userData = {
      id: user.uid,
      nome: adminNome,
      email: adminEmail,
      role: 'admin',
      ativo: true,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    };

    await setDoc(doc(db, 'controle_users', user.uid), userData);

    return NextResponse.json({ 
      success: true, 
      message: 'Usuário admin criado com sucesso',
      user: userData,
      credentials: {
        email: adminEmail,
        password: adminPassword
      }
    });
  } catch (error: any) {
    console.error('Erro ao criar usuário admin:', error);
    
    // Se o usuário já existe, retornar sucesso
    if (error.code === 'auth/email-already-in-use') {
      // Tentar atualizar o role
      try {
        const loginResult = await signInWithEmailAndPassword(auth, 'admin@clickse.com', '123456');
        const user = loginResult.user;
        
        const userDoc = await getDoc(doc(db, 'controle_users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        await setDoc(doc(db, 'controle_users', user.uid), {
          ...userData,
          id: user.uid,
          nome: 'Administrador',
          email: 'admin@clickse.com',
          role: 'admin',
          ativo: true,
          dataCadastro: userData.dataCadastro || new Date(),
          dataAtualizacao: new Date()
        }, { merge: true });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Usuário admin já existe e foi atualizado',
          user: { ...userData, id: user.uid, role: 'admin' }
        });
      } catch (updateError: any) {
        return NextResponse.json(
          { error: 'Usuário já existe mas não foi possível atualizar. Tente fazer login com a senha original.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: error.message || 'Erro ao criar usuário admin' },
      { status: 500 }
    );
  }
}

