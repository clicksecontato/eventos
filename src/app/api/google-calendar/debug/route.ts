/**
 * API Route para obter informações de debug do Google Calendar
 * 
 * GET /api/google-calendar/debug
 * 
 * Esta rota retorna informações detalhadas sobre o token e conexão do Google Calendar
 * para fins de debug durante desenvolvimento.
 */

import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse
} from '@/lib/api/route-helpers';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

// Função de descriptografia (mesma do serviço)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

function decrypt(encrypted: string, key: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const tokenRepo = repositoryFactory.getGoogleCalendarTokenRepository();
    const token = await tokenRepo.findByUserId(user.id);

    if (!token) {
      return createApiResponse({
        connected: false,
        message: 'Token não encontrado. Conecte sua conta do Google Calendar primeiro.'
      });
    }

    // Descriptografar tokens
    let accessToken = '';
    let refreshToken = '';
    let accessTokenPreview = '';
    let refreshTokenPreview = '';
    
    try {
      accessToken = decrypt(token.accessToken, ENCRYPTION_KEY);
      refreshToken = decrypt(token.refreshToken, ENCRYPTION_KEY);
      
      // Criar preview (primeiros 20 e últimos 10 caracteres)
      if (accessToken.length > 30) {
        accessTokenPreview = `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}`;
      } else {
        accessTokenPreview = accessToken.substring(0, 30);
      }
      
      if (refreshToken.length > 30) {
        refreshTokenPreview = `${refreshToken.substring(0, 20)}...${refreshToken.substring(refreshToken.length - 10)}`;
      } else {
        refreshTokenPreview = refreshToken.substring(0, 30);
      }
    } catch (error) {
      console.error('Erro ao descriptografar tokens:', error);
    }

    // Verificar se token está expirado
    const agora = new Date();
    const expiresAt = token.expiresAt instanceof Date 
      ? token.expiresAt 
      : new Date(token.expiresAt);
    
    const isExpired = agora.getTime() >= expiresAt.getTime();
    const minutesUntilExpiry = Math.floor((expiresAt.getTime() - agora.getTime()) / (1000 * 60));

    // Tentar obter informações do calendário
    let calendarInfo = null;
    let calendarError = null;
    
    try {
      const { getServiceFactory } = await import('@/lib/factories/service-factory');
      const serviceFactory = getServiceFactory();
      const googleService = serviceFactory.getGoogleCalendarService();
      calendarInfo = await googleService.getCalendarInfo(user.id);
    } catch (error: any) {
      calendarError = {
        message: error.message,
        code: error.code,
        status: error.response?.status
      };
    }

    // Tentar validar o token fazendo uma requisição simples ao calendário
    let tokenValid = false;
    let tokenValidationError = null;
    let tokenTestDetails = null;
    
    try {
      const { getServiceFactory } = await import('@/lib/factories/service-factory');
      const serviceFactory = getServiceFactory();
      const googleService = serviceFactory.getGoogleCalendarService();
      
      // Tentar obter informações do calendário (vai validar e renovar token se necessário)
      const calendarInfo = await googleService.getCalendarInfo(user.id);
      tokenValid = !!calendarInfo && !!calendarInfo.email;
      tokenTestDetails = {
        success: true,
        calendarEmail: calendarInfo.email,
        calendarId: calendarInfo.calendarId
      };
    } catch (error: any) {
      tokenValid = false;
      tokenValidationError = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        response: error.response?.data,
        stack: error.stack
      };
      
      // Tentar fazer uma requisição direta com o token para ver o erro exato
      try {
        // Usar o accessToken descriptografado que já temos
        const testResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
        const tokenInfo = await testResponse.json();
        
        // Verificar se o client_id do token corresponde ao configurado
        const tokenClientId = tokenInfo.issued_to || tokenInfo.audience;
        const configuredClientId = process.env.GOOGLE_CLIENT_ID;
        const clientIdMatch = tokenClientId === configuredClientId;
        
        tokenTestDetails = {
          success: false,
          tokenInfo: tokenInfo,
          httpStatus: testResponse.status,
          httpStatusText: testResponse.statusText,
          clientIdValidation: {
            tokenClientId: tokenClientId,
            configuredClientId: configuredClientId,
            match: clientIdMatch,
            warning: !clientIdMatch ? '⚠️ O client_id do token não corresponde ao configurado no ambiente!' : null
          }
        };
      } catch (tokenInfoError: any) {
        tokenTestDetails = {
          success: false,
          tokenInfoError: tokenInfoError.message
        };
      }

      // Tentar fazer uma requisição direta à API do Calendar para ver o erro exato
      try {
        console.log('[Debug] Testando token diretamente na API do Calendar...');
        const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const calendarData = await calendarResponse.json();
        console.log('[Debug] Resposta da API do Calendar:', {
          status: calendarResponse.status,
          data: calendarData
        });
        
        tokenTestDetails = {
          ...tokenTestDetails,
          calendarApiTest: {
            httpStatus: calendarResponse.status,
            httpStatusText: calendarResponse.statusText,
            response: calendarData,
            success: calendarResponse.ok
          }
        };
      } catch (calendarApiError: any) {
        console.error('[Debug] Erro ao testar API do Calendar:', calendarApiError);
        tokenTestDetails = {
          ...tokenTestDetails,
          calendarApiError: {
            message: calendarApiError.message,
            stack: calendarApiError.stack
          }
        };
      }

      // Tentar também com o OAuth2Client para ver se funciona
      try {
        console.log('[Debug] Testando com OAuth2Client...');
        const { getServiceFactory } = await import('@/lib/factories/service-factory');
        const serviceFactory = getServiceFactory();
        const googleService = serviceFactory.getGoogleCalendarService();
        
        // Usar o método getCalendarInfo que já usa OAuth2Client internamente
        const calendarInfo = await googleService.getCalendarInfo(user.id);
        
        
        tokenTestDetails = {
          ...tokenTestDetails,
          oauth2ClientTest: {
            success: true,
            calendarId: calendarInfo.calendarId,
            calendarEmail: calendarInfo.email
          }
        };
      } catch (oauth2Error: any) {
        console.error('[Debug] Erro ao testar com OAuth2Client:', {
          message: oauth2Error.message,
          code: oauth2Error.code,
          response: oauth2Error.response?.data
        });
        
        tokenTestDetails = {
          ...tokenTestDetails,
          oauth2ClientTest: {
            success: false,
            error: {
              message: oauth2Error.message,
              code: oauth2Error.code,
              response: oauth2Error.response?.data,
              status: oauth2Error.response?.status
            }
          }
        };
      }
    }

    // Verificar variáveis de ambiente
    const envCheck = {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUri: !!(process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI_PROD),
      clientId: process.env.GOOGLE_CLIENT_ID || 'Não configurado',
      clientIdPreview: process.env.GOOGLE_CLIENT_ID ? 
        `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...${process.env.GOOGLE_CLIENT_ID.substring(process.env.GOOGLE_CLIENT_ID.length - 10)}` : 'Não configurado',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI_PROD || 'Não configurado'
    };

    return createApiResponse({
      connected: true,
      environment: envCheck,
      token: {
        id: token.id,
        userId: token.userId,
        accessToken: accessToken, // Token completo para debug
        accessTokenPreview: accessTokenPreview,
        refreshToken: refreshToken, // Token completo para debug
        refreshTokenPreview: refreshTokenPreview,
        expiresAt: expiresAt.toISOString(),
        expiresAtFormatted: expiresAt.toLocaleString('pt-BR'),
        isExpired: isExpired,
        minutesUntilExpiry: isExpired ? 0 : minutesUntilExpiry,
        calendarId: token.calendarId,
        syncEnabled: token.syncEnabled,
        lastSyncAt: token.lastSyncAt ? new Date(token.lastSyncAt).toISOString() : null,
        lastSyncAtFormatted: token.lastSyncAt ? new Date(token.lastSyncAt).toLocaleString('pt-BR') : null,
        dataCadastro: token.dataCadastro instanceof Date ? token.dataCadastro.toISOString() : new Date(token.dataCadastro).toISOString(),
        dataAtualizacao: token.dataAtualizacao instanceof Date ? token.dataAtualizacao.toISOString() : new Date(token.dataAtualizacao).toISOString()
      },
      calendarInfo: calendarInfo || null,
      calendarError: calendarError,
      tokenValidation: {
        valid: tokenValid,
        error: tokenValidationError,
        testDetails: tokenTestDetails
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

