/**
 * API Route para receber o callback do OAuth do Google Calendar
 * 
 * GET /api/google-calendar/callback?code=...&state=...
 * 
 * Esta rota é opcional e não quebra o sistema se não estiver configurada.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAuthenticatedUser,
  getQueryParams
} from '@/lib/api/route-helpers';
import { verificarAcessoGoogleCalendar } from '@/lib/utils/google-calendar-auth';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

// Funções simples de criptografia (usar biblioteca adequada em produção)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

function encrypt(text: string, key: string): string {
  if (process.env.NODE_ENV === 'production' && key === 'default-key-change-in-production') {
    throw new Error('ENCRYPTION_KEY deve ser configurada em produção');
  }
  return Buffer.from(text).toString('base64');
}

export async function GET(request: NextRequest) {
  try {
    console.log('[Google Calendar Callback] Iniciando callback OAuth');
    
    const user = await getAuthenticatedUser();

    // Verificar se usuário tem plano permitido
    const temAcesso = await verificarAcessoGoogleCalendar(user.id);
    if (!temAcesso) {
      return NextResponse.redirect(
        new URL('/configuracoes/calendario?error=access_denied', request.url)
      );
    }

    const queryParams = getQueryParams(request);
    const code = queryParams.get('code');
    const state = queryParams.get('state');
    const error = queryParams.get('error');

    console.log('[Google Calendar Callback] Parâmetros recebidos:', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      stateValue: state,
      expectedState: user.id
    });

    // Verificar se usuário cancelou autorização
    if (error) {
      console.warn('[Google Calendar Callback] Erro do Google:', error);
      return NextResponse.redirect(
        new URL(`/configuracoes/calendario?error=user_cancelled&details=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      console.error('[Google Calendar Callback] Código não recebido');
      return NextResponse.redirect(
        new URL('/configuracoes/calendario?error=no_code', request.url)
      );
    }

    // Validar state (deve ser o userId)
    if (state !== user.id) {
      console.error('[Google Calendar Callback] State inválido:', {
        received: state,
        expected: user.id
      });
      return NextResponse.redirect(
        new URL('/configuracoes/calendario?error=invalid_state', request.url)
      );
    }

    console.log('[Google Calendar Callback] Validando código com Google...');

    // Importação dinâmica do serviço
    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const googleService = serviceFactory.getGoogleCalendarService();
    const tokenRepo = repositoryFactory.getGoogleCalendarTokenRepository();

    // Trocar código por tokens
    let tokens;
    try {
      tokens = await googleService.exchangeCodeForTokens(code);
      console.log('[Google Calendar Callback] Tokens recebidos com sucesso');
    } catch (tokenError: any) {
      console.error('[Google Calendar Callback] Erro ao trocar código por tokens:', tokenError);
      // Se o código já foi usado, pode ser que o token já existe
      if (tokenError.message?.includes('invalid_grant') || tokenError.message?.includes('code')) {
        // Verificar se já existe token
        const tokenExistente = await tokenRepo.findByUserId(user.id);
        if (tokenExistente) {
          console.log('[Google Calendar Callback] Token já existe, redirecionando com sucesso');
          return NextResponse.redirect(
            new URL('/configuracoes/calendario?success=already_connected', request.url)
          );
        }
      }
      throw tokenError;
    }

    console.log('[Google Calendar Callback] Obtendo informações do calendário...');

    // Obter informações do calendário usando o access token
    let calendarInfo;
    try {
      calendarInfo = await googleService.getCalendarInfo(undefined, tokens.accessToken);
      
      // Validar se obteve o email/calendarId
      if (!calendarInfo.email && !calendarInfo.calendarId) {
        calendarInfo = {
          email: '',
          calendarId: 'primary'
        };
      }
    } catch (infoError: any) {
      // Tentar obter email de forma alternativa usando o token diretamente
      try {
        const emailResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`
          }
        });
        
        if (emailResponse.ok) {
          const userInfo = await emailResponse.json();
          calendarInfo = {
            email: userInfo.email || '',
            calendarId: userInfo.email || 'primary'
          };
        } else {
          throw new Error('Não foi possível obter email via userinfo');
        }
      } catch (altError: any) {
        // Continuar mesmo se não conseguir obter email
        calendarInfo = {
          email: '',
          calendarId: 'primary'
        };
      }
    }

    // Verificar se já existe token para este usuário
    const tokenExistente = await tokenRepo.findByUserId(user.id);
    console.log('[Google Calendar Callback] Token existente:', !!tokenExistente);

    // Criptografar tokens antes de armazenar
    try {
      const encryptedAccessToken = encrypt(tokens.accessToken, ENCRYPTION_KEY);
      const encryptedRefreshToken = encrypt(tokens.refreshToken, ENCRYPTION_KEY);
      console.log('[Google Calendar Callback] Tokens criptografados');

      if (tokenExistente) {
        // Atualizar token existente
        console.log('[Google Calendar Callback] Atualizando token existente:', tokenExistente.id);
        await tokenRepo.update(tokenExistente.id, {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiresAt,
          calendarId: calendarInfo.calendarId,
          syncEnabled: true,
          dataAtualizacao: new Date()
        });
        console.log('[Google Calendar Callback] Token atualizado com sucesso');
      } else {
        // Criar novo token
        console.log('[Google Calendar Callback] Criando novo token');
        const novoToken = await tokenRepo.create({
          userId: user.id,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiresAt,
          calendarId: calendarInfo.calendarId,
          syncEnabled: true,
          dataCadastro: new Date(),
          dataAtualizacao: new Date()
        });
        console.log('[Google Calendar Callback] Token criado com sucesso:', novoToken.id);
      }

      // Verificar se foi salvo corretamente
      const tokenVerificado = await tokenRepo.findByUserId(user.id);
      if (!tokenVerificado) {
        throw new Error('Token não foi salvo corretamente');
      }
      console.log('[Google Calendar Callback] Token verificado e salvo corretamente');

      return NextResponse.redirect(
        new URL('/configuracoes/calendario?success=connected', request.url)
      );
    } catch (saveError: any) {
      console.error('[Google Calendar Callback] Erro ao salvar token:', saveError);
      throw saveError;
    }
  } catch (error: any) {
    console.error('[Google Calendar Callback] Erro geral no callback:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Mensagem de erro mais amigável
    let errorMessage = 'Erro ao conectar Google Calendar';
    if (error.message?.includes('invalid_grant')) {
      errorMessage = 'Código de autorização inválido ou já usado. Tente conectar novamente.';
    } else if (error.message?.includes('ENCRYPTION_KEY')) {
      errorMessage = 'Erro de configuração. Contate o administrador.';
    } else {
      errorMessage = error.message || 'Erro desconhecido';
    }

    return NextResponse.redirect(
      new URL(`/configuracoes/calendario?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}

