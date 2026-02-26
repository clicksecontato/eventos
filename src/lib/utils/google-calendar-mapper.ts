/**
 * Utilitários para mapear dados entre Clicksehub e Google Calendar
 * 
 * Esta função é segura e não quebra o sistema se o Google Calendar não estiver configurado.
 */

import { Evento } from '@/types';
import { GoogleCalendarEvent } from '@/types/google-calendar';

/**
 * Converte um Evento do Clicksehub para formato do Google Calendar
 * 
 * Nota: Apenas data/hora de início é sincronizada (sem data/hora final)
 */
export function mapEventoToGoogleCalendar(evento: Evento): GoogleCalendarEvent {
  // Criar data/hora de início combinando dataEvento e horarioInicio
  const dataEvento = evento.dataEvento instanceof Date 
    ? evento.dataEvento 
    : new Date(evento.dataEvento);
  
  // Parse do horário (formato HH:mm) - usar 00:00 como padrão se não tiver
  let horas = 0;
  let minutos = 0;
  if (evento.horarioInicio && evento.horarioInicio.includes(':')) {
    const partes = evento.horarioInicio.split(':').map(Number);
    horas = partes[0] || 0;
    minutos = partes[1] || 0;
  }
  
  const startDateTime = new Date(dataEvento);
  startDateTime.setHours(horas, minutos, 0, 0);
  
  // Título do evento (nome do evento ou nome do cliente)
  const clienteNome = evento.cliente?.nome || (evento.clienteId ? `Cliente ID: ${evento.clienteId}` : '');
  const summary = evento.nomeEvento || clienteNome || 'Evento sem título';
  
  // Descrição com informações do evento
  const description = [
    evento.tipoEvento && `Tipo: ${evento.tipoEvento}`,
    clienteNome && `Cliente: ${clienteNome}`,
    evento.local && `Local: ${evento.local}`,
    evento.observacoes && `Observações: ${evento.observacoes}`
  ].filter(Boolean).join('\n');
  
  // Localização (endereço completo)
  const location = evento.endereco || evento.local || undefined;
  
  return {
    summary,
    description: description || undefined,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/Sao_Paulo'
    },
    // Google Calendar requer campo 'end', mas será o mesmo que 'start' 
    // já que não temos duração específica nesta versão
    end: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/Sao_Paulo'
    },
    location
  };
}

/**
 * Converte um evento do Google Calendar para formato do Clicksehub
 * 
 * Nota: Esta função é usada para sincronização bidirecional (futuro)
 */
export function mapGoogleCalendarToEvento(
  googleEvent: GoogleCalendarEvent, 
  userId: string
): Partial<Evento> {
  // Extrair data/hora de início
  const startDate = googleEvent.start.dateTime 
    ? new Date(googleEvent.start.dateTime)
    : googleEvent.start.date 
    ? new Date(googleEvent.start.date)
    : new Date();
  
  // Formatar horário (HH:mm)
  const horarioInicio = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
  
  return {
    nomeEvento: googleEvent.summary,
    dataEvento: startDate,
    horarioInicio,
    local: googleEvent.location || '',
    endereco: googleEvent.location || '',
    observacoes: googleEvent.description || undefined,
    // googleCalendarEventId será definido separadamente
    // googleCalendarSyncedAt será definido separadamente
  };
}

