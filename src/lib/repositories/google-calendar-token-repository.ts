/**
 * Repository para gerenciar tokens do Google Calendar
 * 
 * Esta classe é opcional e não quebra o sistema se não for usada.
 */

import { FirestoreRepository } from './firestore-repository';
import { GoogleCalendarToken } from '@/types/google-calendar';
import { COLLECTIONS } from '../firestore/collections';

export class GoogleCalendarTokenRepository extends FirestoreRepository<GoogleCalendarToken> {
  constructor() {
    super(COLLECTIONS.GOOGLE_CALENDAR_TOKENS);
  }

  /**
   * Busca token por userId
   */
  async findByUserId(userId: string): Promise<GoogleCalendarToken | null> {
    const tokens = await this.findWhere('userId', '==', userId);
    return tokens.length > 0 ? tokens[0] : null;
  }

  /**
   * Busca token por resourceId (usado em webhooks)
   */
  async findByResourceId(resourceId: string): Promise<GoogleCalendarToken | null> {
    const tokens = await this.findWhere('resourceId', '==', resourceId);
    return tokens.length > 0 ? tokens[0] : null;
  }

  /**
   * Atualiza status de sincronização
   */
  async updateSyncStatus(userId: string, syncEnabled: boolean): Promise<GoogleCalendarToken> {
    const token = await this.findByUserId(userId);
    if (!token) {
      throw new Error('Token não encontrado para o usuário');
    }
    return this.update(token.id, { 
      syncEnabled,
      dataAtualizacao: new Date()
    });
  }

  /**
   * Atualiza última sincronização
   */
  async updateLastSync(userId: string): Promise<GoogleCalendarToken> {
    const token = await this.findByUserId(userId);
    if (!token) {
      throw new Error('Token não encontrado para o usuário');
    }
    return this.update(token.id, { 
      lastSyncAt: new Date(),
      dataAtualizacao: new Date()
    });
  }
}

