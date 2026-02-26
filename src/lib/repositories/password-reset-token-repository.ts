import { FirestoreRepository } from './firestore-repository';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export interface PasswordResetToken {
  token: string;
  email: string;
  firebaseCode: string;
  expiresAt: Date;
  used: boolean;
}

export class PasswordResetTokenRepository extends FirestoreRepository<PasswordResetToken & { id: string }> {
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
      const q = query(
        collection(db, this.collectionName),
        where('token', '==', token),
        where('used', '==', false)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      
      // Verificar se o token expirou
      const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      if (expiresAt < new Date()) {
        // Token expirado, marcar como usado e deletar
        await deleteDoc(doc(db, this.collectionName, docSnap.id));
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
      const q = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(q);
      const now = new Date();
      
      const deletePromises: Promise<void>[] = [];
      
      querySnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        
        if (expiresAt < now || data.used === true) {
          deletePromises.push(deleteDoc(doc(db, this.collectionName, docSnap.id)));
        }
      });
      
      await Promise.all(deletePromises);
    } catch (error) {
      // Erro ao limpar tokens expirados
    }
  }
}

