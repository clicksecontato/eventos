import { AdminFirestoreRepository } from './admin-firestore-repository';
import { User } from '@/types';

/**
 * Repository de usuários usando Firebase Admin SDK
 * Bypassa as regras de segurança do Firestore (usado apenas no servidor)
 */
export class AdminUserRepository extends AdminFirestoreRepository<User> {
  constructor() {
    super('controle_users');
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Busca exata com email normalizado
    const users = await this.findWhere('email', '==', normalizedEmail);
    if (users.length > 0) {
      return users[0];
    }
    
    // Fallback: buscar todos e filtrar localmente (case-insensitive)
    try {
      const allUsers = await this.findAll();
      const foundUser = allUsers.find(u => 
        u.email && u.email.toLowerCase().trim() === normalizedEmail
      );
      return foundUser || null;
    } catch (error) {
      console.error('Erro ao buscar usuário por email (fallback):', error);
      return null;
    }
  }

  async findByRole(role: string): Promise<User[]> {
    return this.findWhere('role', '==', role);
  }

  async getActiveUsers(): Promise<User[]> {
    return this.findWhere('ativo', '==', true);
  }

  async updateUserProfile(userId: string, profileData: Partial<User>): Promise<User> {
    return this.update(userId, profileData);
  }
}

