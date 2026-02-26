import { AdminFirestoreRepository } from './admin-firestore-repository';
import { Timestamp } from 'firebase-admin/firestore';

export interface PasswordResetToken {
  token: string;
  email: string;
  firebaseCode: string;
  expiresAt: Date;
  used: boolean;
}

/**
 * Repository de tokens de reset de senha usando Firebase Admin SDK
 * Bypassa as regras de segurança do Firestore (usado apenas no servidor)
 */
export class AdminPasswordResetTokenRepository extends AdminFirestoreRepository<PasswordResetToken & { id: string }> {
  constructor() {
    super('password_reset_tokens');
  }

  /**
   * Criar token de reset
   */
  async createToken(data: Omit<PasswordResetToken, 'used'>): Promise<string> {
    const token = await this.create({
      ...data,
      used: false
    });
    return token.id;
  }

  /**
   * Buscar token por valor do token
   */
  async findByToken(token: string): Promise<(PasswordResetToken & { id: string }) | null> {
    try {
      // Buscar tokens não usados com o token específico
      const tokens = await this.getCollection()
        .where('token', '==', token)
        .where('used', '==', false)
        .get();
      
      if (tokens.empty) {
        return null;
      }
      
      const docSnap = tokens.docs[0];
      const data = docSnap.data();
      
      // Verificar se o token expirou
      let expiresAt: Date;
      if (data.expiresAt instanceof Timestamp) {
        expiresAt = data.expiresAt.toDate();
      } else if (data.expiresAt?.toDate) {
        expiresAt = data.expiresAt.toDate();
      } else {
        expiresAt = new Date(data.expiresAt);
      }
      
      if (expiresAt < new Date()) {
        // Token expirado, deletar
        await this.delete(docSnap.id);
        return null;
      }
      
      return this.convertFirestoreData(data, docSnap.id);
    } catch (error) {
      return null;
    }
  }

  /**
   * Marcar token como usado
   */
  async markAsUsed(tokenId: string): Promise<void> {
    await this.update(tokenId, { used: true });
  }

  /**
   * Limpar tokens expirados
   */
  async cleanExpiredTokens(): Promise<void> {
    try {
      const querySnapshot = await this.getCollection().get();
      const now = new Date();
      
      const deletePromises: Promise<void>[] = [];
      
      querySnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        let expiresAt: Date;
        
        if (data.expiresAt instanceof Timestamp) {
          expiresAt = data.expiresAt.toDate();
        } else if (data.expiresAt?.toDate) {
          expiresAt = data.expiresAt.toDate();
        } else {
          expiresAt = new Date(data.expiresAt);
        }
        
        if (expiresAt < now || data.used === true) {
          deletePromises.push(this.delete(docSnap.id));
        }
      });
      
      await Promise.all(deletePromises);
    } catch (error) {
      // Erro ao limpar tokens expirados
    }
  }
}
