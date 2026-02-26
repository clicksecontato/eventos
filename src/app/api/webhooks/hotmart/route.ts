import { NextRequest } from 'next/server';
import { 
  handleApiError,
  createApiResponse,
  createErrorResponse
} from '@/lib/api/route-helpers';
import { HotmartWebhookService } from '@/lib/services/hotmart-webhook-service';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { PlanoService } from '@/lib/services/plano-service';

export async function POST(request: NextRequest) {
  try {
    // Obter o body como texto primeiro (para validação HMAC)
    const bodyText = await request.text();
    let payload: any;
    
    try {
      payload = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      return createErrorResponse('Payload JSON inválido', 400);
    }

    // Usar repositórios Admin que bypassam as regras de segurança do Firestore
    // Webhooks são executados no servidor e precisam de acesso administrativo
    const userRepo = new AdminUserRepository();
    const planoRepo = new AdminPlanoRepository();
    const assinaturaRepo = new AdminAssinaturaRepository();
    const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
    // PlanoService.aplicarPlanoUsuario cria/atualiza assinatura e sincroniza no user: precisa de assinaturaRepo e assinaturaService Admin
    const planoService = new PlanoService(planoRepo, undefined, assinaturaRepo, undefined, assinaturaService);
    const service = new HotmartWebhookService(assinaturaRepo, planoRepo, userRepo, planoService, assinaturaService);

    // Segundo a documentação oficial do Hotmart:
    // https://developers.hotmart.com/docs/pt-BR/tutorials/use-webhook-for-subscriptions/
    // O header correto é 'x-hotmart-hmac-sha256'
    const signature = request.headers.get('x-hotmart-hmac-sha256') || '';
    
    // Obter secret da variável de ambiente
    const secret = process.env.HOTMART_WEBHOOK_SECRET || '';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const validateHmac = process.env.HOTMART_VALIDATE_HMAC !== 'false';


    // Validar HMAC se estiver habilitado e em produção
    if (validateHmac && secret && !isDevelopment) {
      if (!signature) {
        console.error('❌ Webhook sem assinatura HMAC no header');
        return createErrorResponse('Assinatura HMAC não fornecida', 401);
      }

      // Validar usando o body como texto (ordem original preservada)
      const isValid = service.validarAssinatura(bodyText, signature, secret);
      
      if (!isValid) {
        console.error('❌ Webhook HMAC inválido');
        return createErrorResponse('Assinatura HMAC inválida', 401);
      }
    } else if (isDevelopment) {
      console.warn('⚠️ Modo desenvolvimento: Validação HMAC desabilitada');
    } else if (!secret) {
      console.warn('⚠️ HOTMART_WEBHOOK_SECRET não configurado: Validação HMAC desabilitada');
    }

    // Processar webhook
    const result = await service.processarWebhook(payload);

    if (!result.success) {
      console.error('❌ Erro ao processar webhook:', result.message);
      return createErrorResponse(result.message, 400);
    }

    return createApiResponse({ 
      success: true, 
      message: result.message 
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET para testar webhook mockado
export async function GET(request: NextRequest) {
  try {
    const queryParams = new URL(request.url).searchParams;
    const email = queryParams.get('email');
    const planoCodigo = queryParams.get('plano') || 'BASICO_MENSAL';
    const evento = queryParams.get('evento') || 'SUBSCRIPTION_PURCHASE';

    if (!email) {
      return createErrorResponse(
        'Parâmetro email é obrigatório. Exemplo: /api/webhooks/hotmart?email=usuario@exemplo.com&plano=PROFISSIONAL_MENSAL&evento=SUBSCRIPTION_PURCHASE',
        400
      );
    }

    // Payload mockado para testes
    const mockPayload = {
      event: evento,
      data: {
        subscription: {
          code: `SUB-${Date.now()}`,
          plan: {
            code: planoCodigo
          },
          buyer: {
            email: email,
            name: 'Usuário Teste'
          },
          status: evento === 'SUBSCRIPTION_PURCHASE' ? 'TRIAL' : 'ACTIVE',
          trial_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          date_next_charge: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    };

    // Usar repositórios Admin que bypassam as regras de segurança do Firestore
    const userRepo = new AdminUserRepository();
    const planoRepo = new AdminPlanoRepository();
    const assinaturaRepo = new AdminAssinaturaRepository();
    const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
    const planoService = new PlanoService(planoRepo, undefined, assinaturaRepo, undefined, assinaturaService);
    const service = new HotmartWebhookService(assinaturaRepo, planoRepo, userRepo, planoService, assinaturaService);
    const result = await service.processarWebhook(mockPayload);

    return createApiResponse({
      success: result.success,
      message: result.message,
      payloadEnviado: mockPayload
    });
  } catch (error) {
    return handleApiError(error);
  }
}

