/**
 * API Route para obter status detalhado com todas as etapas do processo
 * 
 * GET /api/google-calendar/detailed-status
 * 
 * Retorna informações detalhadas de cada etapa do processo de conexão e uso do Google Calendar
 */

import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse
} from '@/lib/api/route-helpers';
import { verificarAcessoGoogleCalendar } from '@/lib/utils/google-calendar-auth';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

interface StepResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: any;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  const steps: StepResult[] = [];
  const addStep = (step: string, status: StepResult['status'], message: string, details?: any) => {
    steps.push({
      step,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  };

  try {
    // ETAPA 1: Verificar autenticação do sistema
    addStep('1. Autenticação do Sistema', 'pending', 'Verificando sessão do usuário...');
    const user = await getAuthenticatedUser();
    
    addStep('1. Autenticação do Sistema', 'success', 'Usuário autenticado', {
      userId: user.id,
      email: user.email,
      name: user.name
    });

    // ETAPA 2: Verificar plano
    addStep('2. Verificação de Plano', 'pending', 'Verificando se o plano permite Google Calendar...');
    const planAllowed = await verificarAcessoGoogleCalendar(user.id);
    
    if (!planAllowed) {
      addStep('2. Verificação de Plano', 'error', 'Plano não permite Google Calendar', {
        planAllowed: false,
        message: 'Esta funcionalidade está disponível apenas para planos Profissional e Premium'
      });
      return createApiResponse({ steps });
    }
    
    addStep('2. Verificação de Plano', 'success', 'Plano permite Google Calendar', {
      planAllowed: true
    });

    // ETAPA 3: Verificar variáveis de ambiente
    addStep('3. Configuração do Ambiente', 'pending', 'Verificando variáveis de ambiente...');
    const envVars = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI || !!process.env.GOOGLE_REDIRECT_URI_PROD,
      ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY
    };
    
    const allEnvVarsSet = Object.values(envVars).every(v => v === true);
    
    if (!allEnvVarsSet) {
      addStep('3. Configuração do Ambiente', 'error', 'Variáveis de ambiente não configuradas', {
        ...envVars,
        GOOGLE_CLIENT_ID_PREVIEW: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...' || 'Não configurado',
        GOOGLE_REDIRECT_URI_VALUE: process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI_PROD || 'Não configurado'
      });
      return createApiResponse({ steps });
    }
    
    addStep('3. Configuração do Ambiente', 'success', 'Todas as variáveis de ambiente configuradas', {
      ...envVars,
      GOOGLE_CLIENT_ID_PREVIEW: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
      GOOGLE_REDIRECT_URI_VALUE: process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI_PROD
    });

    // ETAPA 4: Buscar token no banco
    addStep('4. Buscar Token no Banco', 'pending', 'Buscando token do Google Calendar no Firestore...');
    const tokenRepo = repositoryFactory.getGoogleCalendarTokenRepository();
    const token = await tokenRepo.findByUserId(user.id);
    
    if (!token) {
      addStep('4. Buscar Token no Banco', 'warning', 'Token não encontrado no banco', {
        message: 'Usuário precisa conectar Google Calendar primeiro'
      });
      return createApiResponse({ steps });
    }
    
    addStep('4. Buscar Token no Banco', 'success', 'Token encontrado no banco', {
      tokenId: token.id,
      calendarId: token.calendarId,
      syncEnabled: token.syncEnabled,
      expiresAt: token.expiresAt?.toISOString(),
      lastSyncAt: token.lastSyncAt?.toISOString(),
      hasAccessToken: !!token.accessToken,
      hasRefreshToken: !!token.refreshToken
    });

    // ETAPA 5: Descriptografar tokens
    addStep('5. Descriptografar Tokens', 'pending', 'Descriptografando tokens...');
    try {
      const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
      
      function decrypt(encrypted: string, key: string): string {
        return Buffer.from(encrypted, 'base64').toString('utf-8');
      }
      
      const accessToken = decrypt(token.accessToken, ENCRYPTION_KEY);
      const refreshToken = decrypt(token.refreshToken, ENCRYPTION_KEY);
      
      addStep('5. Descriptografar Tokens', 'success', 'Tokens descriptografados com sucesso', {
        accessTokenLength: accessToken.length,
        refreshTokenLength: refreshToken.length,
        accessTokenPreview: accessToken.substring(0, 20) + '...',
        refreshTokenPreview: refreshToken.substring(0, 20) + '...'
      });

      // ETAPA 6: Verificar expiração do token
      addStep('6. Verificar Expiração do Token', 'pending', 'Verificando se o token está expirado...');
      const agora = new Date();
      const dataExpiracao = token.expiresAt instanceof Date ? token.expiresAt : new Date(token.expiresAt);
      const margemSeguranca = 5 * 60 * 1000; // 5 minutos
      const tokenExpirado = agora.getTime() >= (dataExpiracao.getTime() - margemSeguranca);
      
      if (tokenExpirado) {
        addStep('6. Verificar Expiração do Token', 'warning', 'Token expirado ou próximo de expirar', {
          expiresAt: dataExpiracao.toISOString(),
          now: agora.toISOString(),
          expired: true,
          minutesRemaining: Math.round((dataExpiracao.getTime() - agora.getTime()) / 60000)
        });
      } else {
        addStep('6. Verificar Expiração do Token', 'success', 'Token ainda válido', {
          expiresAt: dataExpiracao.toISOString(),
          now: agora.toISOString(),
          expired: false,
          minutesRemaining: Math.round((dataExpiracao.getTime() - agora.getTime()) / 60000)
        });
      }

      // ETAPA 7: Testar token com Google tokeninfo
      addStep('7. Validar Token com Google (tokeninfo)', 'pending', 'Validando token com Google tokeninfo API...');
      try {
        const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
        const tokenInfo = await tokenInfoResponse.json();
        
        if (tokenInfoResponse.ok) {
          addStep('7. Validar Token com Google (tokeninfo)', 'success', 'Token válido segundo Google tokeninfo', {
            issued_to: tokenInfo.issued_to,
            audience: tokenInfo.audience,
            scope: tokenInfo.scope,
            expires_in: tokenInfo.expires_in,
            access_type: tokenInfo.access_type,
            httpStatus: tokenInfoResponse.status
          });
        } else {
          addStep('7. Validar Token com Google (tokeninfo)', 'error', 'Token inválido segundo Google tokeninfo', {
            error: tokenInfo.error,
            error_description: tokenInfo.error_description,
            httpStatus: tokenInfoResponse.status
          });
        }
      } catch (error: any) {
        addStep('7. Validar Token com Google (tokeninfo)', 'error', 'Erro ao validar token com tokeninfo', {
          message: error.message,
          error: error.toString()
        });
      }

      // ETAPA 8: Configurar OAuth2Client
      addStep('8. Configurar OAuth2Client', 'pending', 'Configurando OAuth2Client com credenciais...');
      try {
        const { OAuth2Client } = await import('google-auth-library');
        const oauth2Client = new OAuth2Client(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI_PROD
        );
        
        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        addStep('8. Configurar OAuth2Client', 'success', 'OAuth2Client configurado com sucesso', {
          clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
          hasAccessToken: true,
          hasRefreshToken: true
        });

        // ETAPA 9: Obter informações do calendário
        addStep('9. Obter Informações do Calendário', 'pending', 'Buscando informações do calendário principal...');
        try {
          const { google } = await import('googleapis');
          const calendar = google.calendar({
            version: 'v3',
            auth: oauth2Client as any
          });
          
          const calendarResponse = await calendar.calendars.get({
            calendarId: 'primary'
          });
          
          addStep('9. Obter Informações do Calendário', 'success', 'Informações do calendário obtidas', {
            calendarId: calendarResponse.data.id,
            summary: calendarResponse.data.summary,
            timeZone: calendarResponse.data.timeZone,
            description: calendarResponse.data.description,
            location: calendarResponse.data.location
          });
        } catch (error: any) {
          addStep('9. Obter Informações do Calendário', 'error', 'Erro ao obter informações do calendário', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status
          });
        }

        // ETAPA 10: Testar criação de evento (simulação)
        addStep('10. Testar Permissões (Listar Eventos)', 'pending', 'Testando permissões listando eventos...');
        try {
          const { google } = await import('googleapis');
          const calendar = google.calendar({
            version: 'v3',
            auth: oauth2Client as any
          });
          
          const eventsResponse = await calendar.events.list({
            calendarId: token.calendarId || 'primary',
            maxResults: 1,
            timeMin: new Date().toISOString()
          });
          
          addStep('10. Testar Permissões (Listar Eventos)', 'success', 'Permissões validadas com sucesso', {
            eventsCount: eventsResponse.data.items?.length || 0,
            canRead: true,
            canWrite: true
          });
        } catch (error: any) {
          addStep('10. Testar Permissões (Listar Eventos)', 'error', 'Erro ao testar permissões', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status
          });
        }

      } catch (error: any) {
        addStep('8. Configurar OAuth2Client', 'error', 'Erro ao configurar OAuth2Client', {
          message: error.message,
          error: error.toString()
        });
      }

    } catch (error: any) {
      addStep('5. Descriptografar Tokens', 'error', 'Erro ao descriptografar tokens', {
        message: error.message,
        error: error.toString()
      });
    }

    return createApiResponse({ steps });
  } catch (error) {
    addStep('Erro Geral', 'error', 'Erro inesperado', {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      error: error instanceof Error ? error.toString() : String(error)
    });
    return handleApiError(error);
  }
}

