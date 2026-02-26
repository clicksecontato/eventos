import { NextRequest } from 'next/server';
import { adminAuth, isFirebaseAdminInitialized, getFirebaseAdminInitializationError } from '@/lib/firebase-admin';
import { generatePasswordResetEmailTemplate } from '@/lib/services/email-service';
import { createPasswordResetLink } from '@/lib/services/password-link-service';
import { sendEmail, isEmailServiceConfigured } from '@/lib/services/resend-email-service';
import { 
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';

// Rate limiting simples em memória (para produção, usar Redis ou similar)
const resetAttempts = new Map<string, { count: number; lastAttempt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const attempt = resetAttempts.get(email);

  if (!attempt) {
    resetAttempts.set(email, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset se passou a janela de tempo
  if (now - attempt.lastAttempt > WINDOW_MS) {
    resetAttempts.set(email, { count: 1, lastAttempt: now });
    return true;
  }

  // Verificar se excedeu o limite
  if (attempt.count >= MAX_ATTEMPTS) {
    return false;
  }

  // Incrementar contador
  attempt.count++;
  attempt.lastAttempt = now;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await getRequestBody<{ email: string }>(request);
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return createErrorResponse('Email é obrigatório', 400);
    }

    // Verificar rate limiting
    if (!checkRateLimit(email.toLowerCase())) {
      return createErrorResponse('Muitas tentativas. Aguarde 1 hora antes de tentar novamente.', 429);
    }

    // Verificar se o Firebase Admin está inicializado
    console.log('[reset-password] Verificando se Firebase Admin está inicializado...');
    if (!isFirebaseAdminInitialized()) {
      const initError = getFirebaseAdminInitializationError();
      console.error('[reset-password] ❌ Firebase Admin não está inicializado');
      if (initError) {
        console.error('[reset-password] Erro de inicialização:', initError.message);
      }
      return createErrorResponse(
        'Firebase Admin não está configurado. Configure GOOGLE_CREDENTIALS_*, FIREBASE_ADMIN_SDK_KEY ou FIREBASE_SERVICE_ACCOUNT_KEY nas variáveis de ambiente.',
        500
      );
    }
    console.log('[reset-password] ✅ Firebase Admin está inicializado');

    // Verificar se o serviço de email está configurado
    console.log('[reset-password] Verificando configuração do serviço de email...');
    if (!isEmailServiceConfigured()) {
      console.error('[reset-password] RESEND_API_KEY não configurada. Configure a variável de ambiente RESEND_API_KEY.');
      console.error('[reset-password] RESEND_API_KEY existe?', !!process.env.RESEND_API_KEY);
      // Não fazer fallback para Firebase - retornar erro claro
      return createErrorResponse(
        'Serviço de email não configurado. Configure RESEND_API_KEY nas variáveis de ambiente.',
        500
      );
    }
    console.log('[reset-password] Serviço de email configurado corretamente.');

    // Tentar usar sistema personalizado
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[reset-password] Processando reset para email:', normalizedEmail);
      
      // Verificar se adminAuth está disponível (já verificamos antes, mas TypeScript precisa disso)
      if (!adminAuth) {
        throw new Error('Firebase Admin Auth não está disponível');
      }
      
      // Criar referência local para garantir ao TypeScript que não é null
      const auth = adminAuth;
      
      // Verificar se o usuário existe usando Firebase Admin
      console.log('[reset-password] Verificando se usuário existe no Firebase...');
      const user = await auth.getUserByEmail(normalizedEmail);
      console.log('[reset-password] Usuário encontrado:', user.uid);

      // Buscar nome do usuário no Firestore (usar Admin para bypassar regras)
      let nome = '';
      try {
        const { AdminUserRepository } = await import('@/lib/repositories/admin-user-repository');
        const userRepo = new AdminUserRepository();
        const userData = await userRepo.findById(user.uid);
        nome = userData?.nome || '';
        console.log('[reset-password] Nome do usuário:', nome || '(não encontrado)');
      } catch (userRepoError: any) {
        console.error('[reset-password] Erro ao buscar dados do usuário:', userRepoError);
      }

      // Gerar link de reset (1 hora de validade)
      console.log('[reset-password] Gerando link de reset...');
      const { resetUrl } = await createPasswordResetLink(normalizedEmail, { expiryHours: 1 });
      console.log('[reset-password] Link de reset criado com sucesso');

      // Gerar template de email
      console.log('[reset-password] Gerando template de email...');
      const emailHtml = generatePasswordResetEmailTemplate(nome, resetUrl);
      const emailSubject = 'Redefinir sua senha - Clicksehub';
      console.log('[reset-password] Template de email gerado. Tamanho HTML:', emailHtml.length, 'bytes');

      // Enviar email usando Resend
      console.log('[reset-password] Enviando email via Resend...');
      const emailResult = await sendEmail({
        to: normalizedEmail,
        subject: emailSubject,
        html: emailHtml,
        from: 'Clicksehub <noreply@clicksehub.com>'
      });

      if (!emailResult.success) {
        console.error('[reset-password] ERRO ao enviar email personalizado:', emailResult.error);
        console.error('[reset-password] Detalhes do erro:', JSON.stringify(emailResult, null, 2));
        // Não fazer fallback para Firebase - retornar erro
        return createErrorResponse(
          `Erro ao enviar email: ${emailResult.error}. Verifique a configuração do Resend.`,
          500
        );
      }

      console.log('[reset-password] ✅ Email personalizado enviado com sucesso para:', normalizedEmail);
      
      return createApiResponse({
        success: true,
        message: 'Email de redefinição enviado com sucesso'
      });

    } catch (error: any) {
      console.error('[reset-password] ❌ ERRO no processo de reset:');
      console.error('[reset-password] Tipo do erro:', error?.constructor?.name);
      console.error('[reset-password] Mensagem:', error?.message);
      console.error('[reset-password] Código:', error?.code);
      console.error('[reset-password] Stack:', error?.stack);
      
      // Se o erro for que o usuário não existe, não expor isso por segurança
      if (error.code === 'auth/user-not-found') {
        console.log('[reset-password] Usuário não encontrado (retornando mensagem genérica por segurança)');
        return createApiResponse({
          success: true,
          message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
        });
      }

      // Para outros erros, logar mas retornar mensagem genérica por segurança
      console.error('[reset-password] Erro desconhecido, retornando mensagem genérica por segurança');
      return createApiResponse({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
      });
    }

  } catch (error) {
    console.error('[reset-password] ❌ ERRO GERAL no endpoint:', error);
    // Por segurança, sempre retornar sucesso mesmo em caso de erro
    return createApiResponse({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
    });
  }
}

