/**
 * Tipos TypeScript para integração com Google Calendar
 * 
 * Esta integração é opcional e não quebra o sistema se não estiver configurada.
 */

export interface GoogleCalendarToken {
  id: string;
  userId: string;
  accessToken: string; // Criptografado
  refreshToken: string; // Criptografado
  expiresAt: Date;
  calendarId: string; // ID do calendário principal (ex: 'primary')
  syncEnabled: boolean;
  lastSyncAt?: Date;
  resourceId?: string; // Para webhooks
  channelId?: string; // Para webhooks
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export interface GoogleCalendarEvent {
  id?: string; // Google's event ID
  summary: string;
  description?: string;
  start: {
    dateTime?: string; // ISO string
    date?: string; // Para eventos de dia inteiro
    timeZone?: string;
  };
  end: {
    dateTime?: string; // ISO string
    date?: string; // Para eventos de dia inteiro
    timeZone?: string;
  };
  location?: string;
  htmlLink?: string; // Link para o evento no Google Calendar
  updated?: string;
}

export interface GoogleCalendarSyncStatus {
  connected: boolean;
  syncEnabled: boolean;
  planAllowed: boolean;
  lastSyncAt?: Date;
  email?: string; // Email da conta Google conectada
}

