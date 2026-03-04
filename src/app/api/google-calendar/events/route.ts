/**
 * API Route para criar eventos diretamente no Google Calendar
 * 
 * POST /api/google-calendar/events
 * 
 * Esta rota é opcional e não quebra o sistema se não estiver configurada.
 */

import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';
import { verificarAcessoGoogleCalendar } from '@/lib/utils/google-calendar-auth';
import { GoogleCalendarEvent } from '@/types/google-calendar';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

function getErrorCode(error: unknown): unknown {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code?: unknown }).code;
  }
  return undefined;
}

function getErrorResponseStatus(error: unknown): unknown {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response;
    return response?.status;
  }
  return undefined;
}

function getErrorResponseData(error: unknown): Record<string, unknown> | null {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    if (response?.data && typeof response.data === 'object') {
      return response.data as Record<string, unknown>;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    // Verificar se usuário tem plano permitido
    const temAcesso = await verificarAcessoGoogleCalendar(user.id);
    if (!temAcesso) {
      return createErrorResponse(
        'Esta funcionalidade está disponível apenas para planos Profissional e Premium.',
        403
      );
    }

    const body = await getRequestBody(request);
    const { summary, description, startDateTime, endDateTime, location, timeZone } = body;

    // Validações
    if (!summary || !summary.trim()) {
      return createErrorResponse('Título do evento é obrigatório', 400);
    }

    if (!startDateTime) {
      return createErrorResponse('Data/hora de início é obrigatória', 400);
    }

    // Validar que endDateTime >= startDateTime (se fornecido)
    if (endDateTime && new Date(endDateTime) < new Date(startDateTime)) {
      return createErrorResponse('Data/hora de término deve ser posterior à data/hora de início', 400);
    }

    // Validar timezone (se fornecido)
    const timeZoneValue = timeZone || 'America/Sao_Paulo';
    try {
      // Verificar se timezone é válido
      Intl.DateTimeFormat(undefined, { timeZone: timeZoneValue });
    } catch {
      return createErrorResponse('Timezone inválido', 400);
    }

    // Criar objeto de evento do Google Calendar
    const googleEvent: GoogleCalendarEvent = {
      summary: summary.trim(),
      description: description?.trim() || undefined,
      start: {
        dateTime: startDateTime,
        timeZone: timeZoneValue
      },
      end: {
        dateTime: endDateTime || startDateTime, // Se não tiver fim, usar o mesmo que início
        timeZone: timeZoneValue
      },
      location: location?.trim() || undefined
    };

    // Importar serviço (server-side apenas)
    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const googleService = serviceFactory.getGoogleCalendarService();

    // Criar evento no Google Calendar
    try {
      const eventId = await googleService.createEventDirectly(user.id, googleEvent);

      return createApiResponse({
        success: true,
        eventId,
        message: 'Evento criado com sucesso no Google Calendar'
      });
    } catch (createError: unknown) {
      console.error('Erro ao criar evento no Google Calendar:', createError);
      
      // Mapear erros específicos da API do Google Calendar
      const errorCode = getErrorCode(createError) || getErrorResponseStatus(createError);
      const errorData = getErrorResponseData(createError);
      
      let errorMessage = getErrorMessage(createError) || 'Erro desconhecido';
      let statusCode = 500;
      
      // Erros específicos da API do Google Calendar
      switch (errorCode) {
        case 400:
          errorMessage = String((errorData?.error as { message?: unknown } | undefined)?.message || 'Dados inválidos. Verifique os campos do evento.');
          statusCode = 400;
          break;
        case 401:
        case 'UNAUTHENTICATED':
          if (errorMessage.includes('Login Required') || errorMessage.includes('invalid_grant')) {
            errorMessage = 'Token expirado ou inválido. Tente desconectar e conectar novamente sua conta do Google Calendar.';
          } else {
            errorMessage = 'Token inválido. Por favor, reconecte sua conta do Google Calendar.';
          }
          statusCode = 401;
          break;
        case 403:
        case 'PERMISSION_DENIED':
          errorMessage = 'Sem permissão para criar eventos neste calendário. Verifique as permissões da sua conta Google.';
          statusCode = 403;
          break;
        case 404:
        case 'NOT_FOUND':
          if (errorMessage.includes('Token não encontrado')) {
            errorMessage = 'Token não encontrado. Conecte sua conta do Google Calendar primeiro.';
          } else {
            errorMessage = 'Calendário não encontrado.';
          }
          statusCode = 404;
          break;
        case 429:
        case 'RESOURCE_EXHAUSTED':
          errorMessage = 'Muitas requisições. Tente novamente em alguns instantes.';
          statusCode = 429;
          break;
        default:
          // Manter mensagem original se não for um erro conhecido
          if (errorMessage.includes('invalid_grant')) {
            errorMessage = 'Token inválido. Por favor, reconecte sua conta do Google Calendar.';
            statusCode = 401;
          } else if (errorMessage.includes('Token não encontrado')) {
            errorMessage = 'Token não encontrado. Conecte sua conta do Google Calendar primeiro.';
            statusCode = 404;
          }
      }
      
      return createErrorResponse(
        errorMessage,
        statusCode,
        { code: errorCode, details: errorData || null }
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}

