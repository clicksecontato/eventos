import { NextRequest } from 'next/server';
import { 
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';
import { adminAuth, isFirebaseAdminInitialized, getFirebaseAdminInitializationError } from '@/lib/firebase-admin';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { generateShortToken, generatePasswordResetEmailTemplate } from '@/lib/services/email-service';
import { sendEmail } from '@/lib/services/resend-email-service';

// Rate limiting
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
  
  if (now - attempt.lastAttempt > WINDOW_MS) {
    resetAttempts.set(email, { count: 1, lastAttempt: now });
    return true;
  }
  
  if (attempt.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  attempt.count++;
  attempt.lastAttempt = now;
  return true;
}


export async function POST(request: NextRequest) {
  try {
    const body = await getRequestBody(request);
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return createErrorResponse('Email é obrigatório', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verificar rate limiting
    if (!checkRateLimit(normalizedEmail)) {
      return createErrorResponse(
        'Muitas tentativas. Aguarde 1 hora antes de tentar novamente.',
        429
      );
    }

    // Verificar se o Firebase Admin está inicializado
    if (!isFirebaseAdminInitialized()) {
      const initError = getFirebaseAdminInitializationError();
      console.error('[reset-password-custom] ❌ Firebase Admin não está inicializado');
      if (initError) {
        console.error('[reset-password-custom] Erro de inicialização:', initError.message);
      }
      return createErrorResponse(
        'Firebase Admin não está configurado. Configure GOOGLE_CREDENTIALS_*, FIREBASE_ADMIN_SDK_KEY ou FIREBASE_SERVICE_ACCOUNT_KEY nas variáveis de ambiente.',
        500
      );
    }

    try {
      // Verificar se o usuário existe usando Firebase Admin
      const user = await adminAuth!.getUserByEmail(normalizedEmail);
      
      // Buscar nome do usuário no Firestore
      const userRepo = repositoryFactory.getUserRepository();
      const userData = await userRepo.findById(user.uid);
      const nome = userData?.nome || '';

      // Gerar código de reset usando Firebase Admin (sem enviar email padrão)
      const resetLink = await adminAuth!.generatePasswordResetLink(normalizedEmail, {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/redefinir-senha`,
        handleCodeInApp: false,
      });

      // Extrair o código do link gerado
      const urlObj = new URL(resetLink);
      const oobCode = urlObj.searchParams.get('oobCode');
      
      if (!oobCode) {
        throw new Error('Código de reset não gerado');
      }

      // Gerar token curto
      const shortToken = generateShortToken();
      
      // Calcular expiração (1 hora)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Armazenar token no banco
      const tokenRepo = repositoryFactory.getPasswordResetTokenRepository();
      await tokenRepo.createToken({
        token: shortToken,
        email: normalizedEmail,
        firebaseCode: oobCode,
        expiresAt
      });

      // Criar URL curta e limpa
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/redefinir-senha?token=${shortToken}`;

      // Gerar template de email
      const emailHtml = generatePasswordResetEmailTemplate(nome, resetUrl);
      const emailSubject = 'Redefinir sua senha - Clicksehub';

      // Enviar email personalizado usando Resend
      const emailResult = await sendEmail({
        to: normalizedEmail,
        subject: emailSubject,
        html: emailHtml,
        from: 'Clicksehub <noreply@clicksehub.com>'
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error || 'Erro ao enviar email');
      }

      return createApiResponse({
        success: true,
        message: 'Email de redefinição enviado com sucesso'
      });

    } catch (error: any) {
      // Não expor se o email existe ou não por segurança
      // Sempre retornar sucesso para evitar enumeração de emails
      return createApiResponse({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
      });
    }

  } catch (error: any) {
    // Sempre retornar sucesso por segurança
    return createApiResponse({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
    });
  }
}

