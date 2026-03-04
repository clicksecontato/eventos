/**
 * Serviço principal para integração com Google Calendar
 * 
 * IMPORTANTE: Este serviço usa googleapis que é uma biblioteca Node.js.
 * Deve ser usado APENAS em server-side (API routes, server actions).
 * 
 * Este serviço é opcional e não quebra o sistema se não estiver configurado.
 */

import { Evento } from '@/types';
import { GoogleCalendarEvent } from '@/types/google-calendar';
import { GoogleCalendarTokenRepository } from '../repositories/google-calendar-token-repository';
import { mapEventoToGoogleCalendar } from '../utils/google-calendar-mapper';
import { verificarAcessoGoogleCalendar } from '../utils/google-calendar-auth';
import { GoogleCalendarSdkPort, OAuthClientPort } from '../integrations/google/google-calendar-client-port';

// Chave de criptografia (deve vir de variável de ambiente)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

// Funções simples de criptografia (usar biblioteca adequada em produção)
function encrypt(text: string, key: string): string {
  // Implementação simplificada - usar crypto em produção
  // Por enquanto, apenas base64 para desenvolvimento
  if (process.env.NODE_ENV === 'production' && key === 'default-key-change-in-production') {
    throw new Error('ENCRYPTION_KEY deve ser configurada em produção');
  }
  return Buffer.from(text).toString('base64');
}

function decrypt(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

function getErrorCode(error: unknown): string | number | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' || typeof code === 'number') {
      return code;
    }
  }
  return undefined;
}

function getErrorResponseData(error: unknown): unknown {
  if (error && typeof error === 'object' && 'response' in error) {
    return (error as { response?: { data?: unknown } }).response?.data;
  }
  return undefined;
}

function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as { response?: { status?: unknown } }).response?.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

export class GoogleCalendarService {
  private tokenRepo: GoogleCalendarTokenRepository;
  private googleSdk: GoogleCalendarSdkPort;

  constructor(
    tokenRepo: GoogleCalendarTokenRepository,
    googleSdk: GoogleCalendarSdkPort
  ) {
    this.tokenRepo = tokenRepo;
    this.googleSdk = googleSdk;
  }

  /**
   * Inicializa o cliente OAuth2
   * IMPORTANTE: Sempre cria uma nova instância para evitar problemas de estado compartilhado
   * entre diferentes requisições/usuários. Isso garante que cada requisição tenha seu próprio
   * OAuth2Client com as credenciais corretas.
   */
  private getOAuth2Client(): OAuthClientPort {
    // Sempre criar nova instância para evitar problemas de estado compartilhado
    // Isso é especialmente importante quando múltiplas requisições acontecem simultaneamente
    return this.googleSdk.createOAuth2Client();
  }

  /**
   * Obtém ou atualiza o access token do usuário
   */
  private async getAccessToken(userId: string): Promise<string> {
    const token = await this.tokenRepo.findByUserId(userId);
    
    if (!token) {
      throw new Error('Token não encontrado. Usuário precisa conectar Google Calendar.');
    }

    // Descriptografar tokens
    const accessToken = decrypt(token.accessToken);
    const refreshToken = decrypt(token.refreshToken);
    
    // Log para debug (não logar o token completo por segurança)
    console.log('[GoogleCalendarService] Token descriptografado - accessToken length:', accessToken?.length || 0);
    console.log('[GoogleCalendarService] Token descriptografado - refreshToken length:', refreshToken?.length || 0);

    // Verificar se token ainda é válido (com margem de 5 minutos para segurança)
    const agora = new Date();
    const margemSeguranca = 5 * 60 * 1000; // 5 minutos em milissegundos
    
    let tokenValido = false;
    if (token.expiresAt) {
      const dataExpiracao = token.expiresAt instanceof Date 
        ? token.expiresAt 
        : new Date(token.expiresAt);
      
      // Se ainda não expirou (com margem de segurança), considerar válido
      if (agora.getTime() < (dataExpiracao.getTime() - margemSeguranca)) {
        tokenValido = true;
        console.log('[GoogleCalendarService] Token ainda válido (expira em:', dataExpiracao.toISOString(), '), usando token atual');
      } else {
        console.log('[GoogleCalendarService] Token expirado ou próximo de expirar (expirou em:', dataExpiracao.toISOString(), '), renovando...');
      }
    } else {
      console.log('[GoogleCalendarService] Token sem data de expiração, tentando renovar...');
    }
    
    // Se token parece válido, verificar se não está vazio
    if (tokenValido) {
      // Verificar se o token não está vazio ou inválido
      if (!accessToken || accessToken.trim() === '') {
        console.log('[GoogleCalendarService] Token vazio, forçando renovação...');
        tokenValido = false;
      } else {
        // Token parece válido, mas vamos sempre renovar para garantir
        // (comentado para testar primeiro sem renovação automática)
        // console.log('[GoogleCalendarService] Token válido, mas forçando renovação para garantir...');
        // tokenValido = false;
        return accessToken;
      }
    }

    // Token expirado ou próximo de expirar, fazer refresh
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    try {
      console.log('[GoogleCalendarService] Renovando token de acesso...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('Access token não recebido ao renovar');
      }

      // Calcular data de expiração (padrão: 1 hora se não fornecido)
      let expiresAt: Date;
      if (credentials.expiry_date) {
        expiresAt = new Date(credentials.expiry_date);
      } else {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
      }

      // Criptografar e salvar novo token
      const encryptedAccessToken = encrypt(credentials.access_token, ENCRYPTION_KEY);
      await this.tokenRepo.update(token.id, {
        accessToken: encryptedAccessToken,
        expiresAt: expiresAt,
        dataAtualizacao: new Date()
      });

      console.log('[GoogleCalendarService] Token renovado com sucesso');
      return credentials.access_token;
    } catch (error: unknown) {
      console.error('[GoogleCalendarService] Erro ao renovar token:', {
        message: getErrorMessage(error),
        code: getErrorCode(error),
        response: getErrorResponseData(error)
      });
      
      // Se o refresh token é inválido, o usuário precisa reconectar
      const message = getErrorMessage(error);
      const code = getErrorCode(error);
      if (message.includes('invalid_grant') || code === 'invalid_grant') {
        throw new Error('Sessão expirada. Por favor, reconecte sua conta Google.');
      }
      
      throw new Error(`Erro ao renovar token de acesso: ${message || 'Erro desconhecido'}. Reconecte sua conta Google.`);
    }
  }

  /**
   * Obtém cliente autenticado do Google Calendar
   */
  private async getCalendarClient(userId: string) {
    const accessToken = await this.getAccessToken(userId);
    const oauth2Client = this.getOAuth2Client();
    
    // Buscar refresh token também para garantir autenticação completa
    const tokenData = await this.tokenRepo.findByUserId(userId);
    if (!tokenData) {
      throw new Error('Token não encontrado');
    }
    
    const refreshTokenDecrypted = decrypt(tokenData.refreshToken);
    
    // Configurar com ambos os tokens
    // IMPORTANTE: 
    // 1. OAuth2Client deve ter client_id e client_secret configurados (já está no construtor)
    // 2. Configurar credentials ANTES de criar o cliente calendar
    // 3. Sempre incluir refresh_token para permitir renovação automática
    oauth2Client.setCredentials({ 
      access_token: accessToken,
      refresh_token: refreshTokenDecrypted
    });
    
    // Criar cliente calendar com OAuth2Client já configurado
    // A biblioteca googleapis usa o OAuth2Client para adicionar automaticamente
    // o header Authorization: Bearer {access_token}
    const calendar = this.googleSdk.createCalendarClient(oauth2Client);
    
    return calendar;
  }

  /**
   * Cria um evento no Google Calendar
   */
  async createEvent(userId: string, evento: Evento): Promise<string> {
    // Verificar acesso
    const temAcesso = await verificarAcessoGoogleCalendar(userId);
    if (!temAcesso) {
      throw new Error('Acesso negado. Esta funcionalidade está disponível apenas para planos Profissional e Premium.');
    }

    const calendar = await this.getCalendarClient(userId);
    const token = await this.tokenRepo.findByUserId(userId);
    
    if (!token) {
      throw new Error('Token não encontrado');
    }

    const googleEvent = mapEventoToGoogleCalendar(evento);

    try {
      const response = await calendar.events.insert({
        calendarId: token.calendarId || 'primary',
        requestBody: googleEvent
      });

      return response.data.id || '';
    } catch (error: unknown) {
      console.error('Erro ao criar evento no Google Calendar:', error);
      throw new Error(`Erro ao criar evento: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Cria um evento diretamente no Google Calendar a partir de um GoogleCalendarEvent
   * Usado para criar eventos diretamente sem precisar de um Evento do sistema
   */
  async createEventDirectly(userId: string, googleEvent: GoogleCalendarEvent): Promise<string> {
    // Verificar acesso
    const temAcesso = await verificarAcessoGoogleCalendar(userId);
    if (!temAcesso) {
      throw new Error('Acesso negado. Esta funcionalidade está disponível apenas para planos Profissional e Premium.');
    }

    const calendar = await this.getCalendarClient(userId);
    const token = await this.tokenRepo.findByUserId(userId);
    
    if (!token) {
      throw new Error('Token não encontrado. Conecte sua conta do Google Calendar primeiro.');
    }

    try {
      const response = await calendar.events.insert({
        calendarId: token.calendarId || 'primary',
        requestBody: googleEvent
      });

      return response.data.id || '';
    } catch (error: unknown) {
      console.error('Erro ao criar evento no Google Calendar:', error);
      throw new Error(`Erro ao criar evento: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Atualiza um evento no Google Calendar
   */
  async updateEvent(userId: string, googleEventId: string, evento: Evento): Promise<void> {
    const temAcesso = await verificarAcessoGoogleCalendar(userId);
    if (!temAcesso) {
      throw new Error('Acesso negado. Esta funcionalidade está disponível apenas para planos Profissional e Premium.');
    }

    const calendar = await this.getCalendarClient(userId);
    const token = await this.tokenRepo.findByUserId(userId);
    
    if (!token) {
      throw new Error('Token não encontrado');
    }

    const googleEvent = mapEventoToGoogleCalendar(evento);

    try {
      await calendar.events.update({
        calendarId: token.calendarId || 'primary',
        eventId: googleEventId,
        requestBody: googleEvent
      });
    } catch (error: unknown) {
      console.error('Erro ao atualizar evento no Google Calendar:', error);
      throw new Error(`Erro ao atualizar evento: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Deleta um evento do Google Calendar
   */
  async deleteEvent(userId: string, googleEventId: string): Promise<void> {
    const temAcesso = await verificarAcessoGoogleCalendar(userId);
    if (!temAcesso) {
      throw new Error('Acesso negado. Esta funcionalidade está disponível apenas para planos Profissional e Premium.');
    }

    const calendar = await this.getCalendarClient(userId);
    const token = await this.tokenRepo.findByUserId(userId);
    
    if (!token) {
      throw new Error('Token não encontrado');
    }

    try {
      await calendar.events.delete({
        calendarId: token.calendarId || 'primary',
        eventId: googleEventId
      });
    } catch (error: unknown) {
      // Se evento já foi deletado, não é erro crítico
      if (getErrorCode(error) === 404) {
        console.warn('Evento já foi deletado do Google Calendar');
        return;
      }
      console.error('Erro ao deletar evento no Google Calendar:', error);
      throw new Error(`Erro ao deletar evento: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Busca um evento no Google Calendar
   */
  async getEvent(userId: string, googleEventId: string): Promise<GoogleCalendarEvent> {
    const calendar = await this.getCalendarClient(userId);
    const token = await this.tokenRepo.findByUserId(userId);
    
    if (!token) {
      throw new Error('Token não encontrado');
    }

    try {
      const response = await calendar.events.get({
        calendarId: token.calendarId || 'primary',
        eventId: googleEventId
      });

      return response.data as unknown as GoogleCalendarEvent;
    } catch (error: unknown) {
      console.error('Erro ao buscar evento no Google Calendar:', error);
      throw new Error(`Erro ao buscar evento: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Sincroniza evento do Clicksehub para Google Calendar
   */
  async syncEventToCalendar(userId: string, evento: Evento): Promise<string> {
    // Se já tem googleCalendarEventId, atualizar
    if (evento.googleCalendarEventId) {
      await this.updateEvent(userId, evento.googleCalendarEventId, evento);
      return evento.googleCalendarEventId;
    }

    // Caso contrário, criar novo
    return await this.createEvent(userId, evento);
  }

  /**
   * Obtém URL de autorização OAuth
   */
  getAuthUrl(state?: string): string {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state || undefined
    });
  }

  /**
   * Troca código de autorização por tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    try {
      const oauth2Client = this.getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('Access token não recebido do Google');
      }

      // Refresh token pode não vir se o usuário já autorizou antes
      // Nesse caso, precisamos usar o refresh token existente
      if (!tokens.refresh_token) {
        console.warn('[GoogleCalendarService] Refresh token não recebido - usuário pode já ter autorizado antes');
        // Se não tem refresh_token, o código já foi usado
        // Isso significa que o usuário já autorizou antes
        throw new Error('Código de autorização já foi usado. Se você já conectou antes, o token pode estar salvo. Tente desconectar e conectar novamente.');
      }

      if (!tokens.expiry_date) {
        // Se não tem expiry_date, usar 1 hora como padrão
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 1);
        return {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: expiryDate
        };
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date)
      };
    } catch (error: unknown) {
      console.error('[GoogleCalendarService] Erro ao trocar código por tokens:', {
        message: getErrorMessage(error),
        code: getErrorCode(error),
        response: getErrorResponseData(error)
      });
      
      // Mensagens de erro mais específicas
      const message = getErrorMessage(error);
      const code = getErrorCode(error);
      if (message.includes('invalid_grant') || code === 'invalid_grant') {
        throw new Error('Código de autorização inválido ou já usado. Tente desconectar e conectar novamente.');
      }
      
      throw new Error(`Erro na autenticação: ${message || 'Erro desconhecido'}`);
    }
  }

  /**
   * Obtém informações do calendário do usuário
   */
  async getCalendarInfo(userId?: string, accessToken?: string): Promise<{ email: string; calendarId: string }> {
    try {
      let calendar;
      const oauth2Client = this.getOAuth2Client();
      
      if (userId) {
        // Se userId fornecido, obter token e configurar
        console.log('[GoogleCalendarService] Obtendo token para userId:', userId);
        const accessToken = await this.getAccessToken(userId);
        console.log('[GoogleCalendarService] Token obtido, configurando OAuth2Client');
        
        // Buscar token completo para obter refresh token também
        const tokenData = await this.tokenRepo.findByUserId(userId);
        if (!tokenData) {
          throw new Error('Token não encontrado');
        }
        
        const refreshTokenDecrypted = decrypt(tokenData.refreshToken);
        
        // Configurar OAuth2Client com access_token e refresh_token
        oauth2Client.setCredentials({ 
          access_token: accessToken,
          refresh_token: refreshTokenDecrypted
        });
        
        console.log('[GoogleCalendarService] OAuth2Client configurado com access_token e refresh_token');
        calendar = this.googleSdk.createCalendarClient(oauth2Client);
      } else if (accessToken) {
        // Se accessToken fornecido diretamente
        console.log('[GoogleCalendarService] Usando accessToken fornecido diretamente');
        oauth2Client.setCredentials({ access_token: accessToken });
        calendar = this.googleSdk.createCalendarClient(oauth2Client);
      } else {
        throw new Error('userId ou accessToken deve ser fornecido');
      }
      
      // Obter informações do calendário principal
      console.log('[GoogleCalendarService] Buscando informações do calendário...');
      const response = await calendar.calendars.get({
        calendarId: 'primary'
      });

      console.log('[GoogleCalendarService] Informações do calendário obtidas:', {
        id: response.data.id,
        summary: response.data.summary,
        timeZone: response.data.timeZone
      });
      
      // O ID do calendário geralmente é o email do usuário
      const calendarId = response.data.id || '';
      
      // Validar se obtivemos um ID válido (não vazio)
      if (!calendarId || calendarId.trim() === '') {
        console.warn('[GoogleCalendarService] Calendar ID vazio, usando "primary"');
        return {
          email: '',
          calendarId: 'primary'
        };
      }
      
      return {
        email: calendarId,
        calendarId: calendarId
      };
    } catch (error: unknown) {
      console.error('[GoogleCalendarService] Erro ao obter informações do calendário:', {
        message: getErrorMessage(error),
        code: getErrorCode(error),
        response: getErrorResponseData(error),
        status: getErrorStatus(error)
      });
      
      // Se for erro de autenticação, tentar renovar token se tiver userId
      const message = getErrorMessage(error);
      const code = getErrorCode(error);
      if ((message.includes('Login Required') || code === 401) && userId) {
        console.log('[GoogleCalendarService] Erro 401 detectado, forçando renovação do token...');
        try {
          // Forçar renovação do token marcando como expirado
          const token = await this.tokenRepo.findByUserId(userId);
          if (token) {
            console.log('[GoogleCalendarService] Token encontrado, forçando renovação...');
            // Atualizar expiresAt para forçar renovação
            await this.tokenRepo.update(token.id, {
              expiresAt: new Date(0) // Data no passado para forçar renovação
            });
            
            // Obter novo token (vai forçar renovação)
            const novoToken = await this.getAccessToken(userId);
            console.log('[GoogleCalendarService] Novo token obtido, tentando novamente...');
            
            const refreshTokenDecrypted = decrypt(token.refreshToken);
            const oauth2Client = this.getOAuth2Client();
            oauth2Client.setCredentials({ 
              access_token: novoToken,
              refresh_token: refreshTokenDecrypted
            });
            
            const calendar = this.googleSdk.createCalendarClient(oauth2Client);
            
            const response = await calendar.calendars.get({
              calendarId: 'primary'
            });
            
            console.log('[GoogleCalendarService] Sucesso após renovação do token');
            return {
              email: response.data.id || '',
              calendarId: response.data.id || 'primary'
            };
          } else {
            throw new Error('Token não encontrado para renovação');
          }
        } catch (retryError: unknown) {
          console.error('[GoogleCalendarService] Erro ao tentar renovar token:', {
            message: getErrorMessage(retryError),
            code: getErrorCode(retryError)
          });
          
          // Se o refresh token também está inválido, usuário precisa reconectar
          const retryMessage = getErrorMessage(retryError);
          const retryCode = getErrorCode(retryError);
          if (retryMessage.includes('invalid_grant') || retryCode === 'invalid_grant') {
            throw new Error('Sessão expirada. Por favor, reconecte sua conta Google.');
          }
          
          throw new Error('Erro de autenticação. Por favor, reconecte sua conta Google.');
        }
      }
      
      throw new Error(`Erro ao obter informações: ${message || 'Erro desconhecido'}`);
    }
  }
}

