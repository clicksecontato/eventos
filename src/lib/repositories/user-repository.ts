import { FirestoreRepository } from './firestore-repository';
import { User } from '@/types';

export class UserRepository extends FirestoreRepository<User> {
  constructor() {
    super('controle_users');
  }

  async findByEmail(email: string): Promise<User | null> {
    // Normalizar email: lowercase e trim para garantir busca correta
    const normalizedEmail = email.toLowerCase().trim();
    
    // Primeira tentativa: busca exata com email normalizado
    const users = await this.findWhere('email', '==', normalizedEmail);
    if (users.length > 0) {
      return users[0];
    }
    
    // Segunda tentativa: buscar todos e filtrar localmente (case-insensitive)
    // Isso é necessário porque alguns emails podem estar salvos com maiúsculas no banco
    // Nota: Esta abordagem pode ser custosa para muitos usuários, mas garante compatibilidade
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
