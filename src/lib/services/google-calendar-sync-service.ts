/* 
 * COMENTADO: Aguardando permissões diretas da Google para dados sensíveis
 * Este serviço será reativado no futuro após obtenção das permissões necessárias
 * 
 * Data de comentário: 2025-01-XX
 */

/**
 * Serviço de sincronização com Google Calendar
 * 
 * Este serviço é chamado após operações de eventos para sincronizar com Google Calendar.
 * Usa importação dinâmica para evitar bundle no cliente.
 * 
 * TODO: Reativar quando tivermos permissões diretas da Google
 */

import { Evento } from '@/types';

export class GoogleCalendarSyncService {
  /**
   * Sincroniza evento com Google Calendar após criação
   * COMENTADO: Aguardando permissões diretas da Google
   */
  static async syncAfterCreate(evento: Evento, userId: string): Promise<void> {
    // Funcionalidade desabilitada temporariamente
    return;
    
    /*
    try {
      // Importação dinâmica para evitar bundle no cliente
      const { GoogleCalendarService } = await import('./google-calendar-service');
      const { repositoryFactory } = await import('../repositories/repository-factory');
      const { verificarAcessoGoogleCalendar } = await import('../utils/google-calendar-auth');
      
      // Verificar se usuário tem acesso
      const temAcesso = await verificarAcessoGoogleCalendar(userId);
      if (!temAcesso) {
        return;
      }

      // Verificar se usuário tem token e sincronização ativa
      const tokenRepo = repositoryFactory.getGoogleCalendarTokenRepository();
      const token = await tokenRepo.findByUserId(userId);
      
      if (!token || !token.syncEnabled) {
        return;
      }

      // Não sincronizar eventos arquivados
      if (evento.arquivado) {
        return;
      }

      const googleService = new GoogleCalendarService();
      const googleEventId = await googleService.syncEventToCalendar(userId, evento);
      
      // Atualizar evento com googleCalendarEventId usando o repository
      const eventoRepo = repositoryFactory.getEventoRepository();
      await eventoRepo.update(evento.id, {
        googleCalendarEventId: googleEventId,
        googleCalendarSyncedAt: new Date()
      }, userId);
      
      console.log('[GoogleCalendarSyncService] Evento criado no Google Calendar:', googleEventId);
    } catch (error) {
      console.error('[GoogleCalendarSyncService] Erro ao sincronizar evento criado:', error);
    }
    */
  }

  /**
   * Sincroniza evento com Google Calendar após atualização
   * COMENTADO: Aguardando permissões diretas da Google
   */
  static async syncAfterUpdate(
    evento: Evento, 
    userId: string, 
    eventoAntigo?: Evento | null
  ): Promise<void> {
    // Funcionalidade desabilitada temporariamente
    return;
    
    /*
    try {
      // Importação dinâmica para evitar bundle no cliente
      const { GoogleCalendarService } = await import('./google-calendar-service');
      const { repositoryFactory } = await import('../repositories/repository-factory');
      const { verificarAcessoGoogleCalendar } = await import('../utils/google-calendar-auth');
      
      // Verificar se usuário tem acesso
      const temAcesso = await verificarAcessoGoogleCalendar(userId);
      if (!temAcesso) {
        return;
      }

      // Verificar se usuário tem token e sincronização ativa
      const tokenRepo = repositoryFactory.getGoogleCalendarTokenRepository();
      const token = await tokenRepo.findByUserId(userId);
      
      if (!token || !token.syncEnabled) {
        return;
      }

      const googleService = new GoogleCalendarService();

      // Se evento foi arquivado, remover do Google Calendar
      if (evento.arquivado) {
        if (eventoAntigo && !eventoAntigo.arquivado && evento.googleCalendarEventId) {
          await googleService.deleteEvent(userId, evento.googleCalendarEventId);
          const eventoRepo = repositoryFactory.getEventoRepository();
          await eventoRepo.update(evento.id, {
            googleCalendarEventId: undefined,
            googleCalendarSyncedAt: new Date()
          }, userId);
          console.log('[GoogleCalendarSyncService] Evento removido do Google Calendar');
        }
        return;
      }

      // Se evento foi desarquivado, criar no Google Calendar
      if (eventoAntigo && eventoAntigo.arquivado && !evento.arquivado) {
        const googleEventId = await googleService.syncEventToCalendar(userId, evento);
        const eventoRepo = repositoryFactory.getEventoRepository();
        await eventoRepo.update(evento.id, {
          googleCalendarEventId: googleEventId,
          googleCalendarSyncedAt: new Date()
        }, userId);
        console.log('[GoogleCalendarSyncService] Evento desarquivado e criado no Google Calendar');
        return;
      }

      // Atualizar ou criar evento no Google Calendar
      if (evento.googleCalendarEventId) {
        await googleService.updateEvent(userId, evento.googleCalendarEventId, evento);
        const eventoRepo = repositoryFactory.getEventoRepository();
        await eventoRepo.update(evento.id, {
          googleCalendarSyncedAt: new Date()
        }, userId);
        console.log('[GoogleCalendarSyncService] Evento atualizado no Google Calendar');
      } else {
        const googleEventId = await googleService.syncEventToCalendar(userId, evento);
        const eventoRepo = repositoryFactory.getEventoRepository();
        await eventoRepo.update(evento.id, {
          googleCalendarEventId: googleEventId,
          googleCalendarSyncedAt: new Date()
        }, userId);
        console.log('[GoogleCalendarSyncService] Evento criado no Google Calendar');
      }
    } catch (error) {
      console.error('[GoogleCalendarSyncService] Erro ao sincronizar evento atualizado:', error);
    }
    */
  }

  /**
   * Remove evento do Google Calendar após arquivamento
   * COMENTADO: Aguardando permissões diretas da Google
   */
  static async syncAfterDelete(evento: Evento, userId: string): Promise<void> {
    // Funcionalidade desabilitada temporariamente
    return;
    
    /*
    try {
      // Importação dinâmica para evitar bundle no cliente
      const { GoogleCalendarService } = await import('./google-calendar-service');
      const { repositoryFactory } = await import('../repositories/repository-factory');
      const { verificarAcessoGoogleCalendar } = await import('../utils/google-calendar-auth');
      
      // Verificar se usuário tem acesso
      const temAcesso = await verificarAcessoGoogleCalendar(userId);
      if (!temAcesso) {
        return;
      }

      // Verificar se usuário tem token e sincronização ativa
      const tokenRepo = repositoryFactory.getGoogleCalendarTokenRepository();
      const token = await tokenRepo.findByUserId(userId);
      
      if (!token || !token.syncEnabled) {
        return;
      }

      // Remover evento do Google Calendar se tiver googleCalendarEventId
      if (evento.googleCalendarEventId) {
        const googleService = new GoogleCalendarService();
        await googleService.deleteEvent(userId, evento.googleCalendarEventId);
        console.log('[GoogleCalendarSyncService] Evento removido do Google Calendar');
      }
    } catch (error) {
      console.error('[GoogleCalendarSyncService] Erro ao remover evento do Google Calendar:', error);
    }
    */
  }
}
