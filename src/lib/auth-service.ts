import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserData {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'user';
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export const authService = {
  // Registrar novo usuário
  async register(email: string, password: string, nome: string, role: 'admin' | 'user' = 'user') {
    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Criar documento do usuário no Firestore
      const userData: UserData = {
        id: user.uid,
        nome,
        email,
        role,
        dataCadastro: new Date(),
        dataAtualizacao: new Date()
      };

      await setDoc(doc(db, 'controle_users', user.uid), userData);

      return { success: true, user: userData };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Erro ao registrar usuário' 
      };
    }
  },

  // Fazer login
  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Buscar dados do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'controle_users', user.uid));
      const userData = userDoc.data() as UserData;

      return { success: true, user: userData };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Erro ao fazer login' 
      };
    }
  },

  // Fazer logout
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Erro ao fazer logout' 
      };
    }
  },

  // Buscar dados do usuário atual
  async getCurrentUser() {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const userDoc = await getDoc(doc(db, 'controle_users', user.uid));
      return userDoc.data() as UserData;
    } catch (error) {
      return null;
    }
  },

  // Atualizar dados do usuário
  async updateUser(userId: string, data: Partial<UserData>) {
    try {
      const userData = {
        ...data,
        dataAtualizacao: new Date()
      };

      await setDoc(doc(db, 'controle_users', userId), userData, { merge: true });
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Erro ao atualizar usuário' 
      };
    }
  },

  // Enviar email de redefinição de senha
  async sendPasswordReset(email: string) {
    try {
      const actionCodeSettings = {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/redefinir-senha`,
        handleCodeInApp: false,
      };
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
      };
    }
  },

  // Verificar código de redefinição
  async verifyResetCode(code: string) {
    try {
      const email = await verifyPasswordResetCode(auth, code);
      return { success: true, email };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Código de redefinição inválido ou expirado'
      };
    }
  },

  // Confirmar redefinição de senha
  async confirmPasswordReset(code: string, newPassword: string) {
    try {
      await confirmPasswordReset(auth, code, newPassword);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Erro ao redefinir senha'
      };
    }
  }
};
