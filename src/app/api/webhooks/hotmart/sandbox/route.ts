import { NextRequest, NextResponse } from 'next/server';
import { HotmartWebhookService } from '@/lib/services/hotmart-webhook-service';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { PlanoService } from '@/lib/services/plano-service';

/**
 * Endpoint de Webhook Sandbox do Hotmart
 * 
 * Este endpoint é específico para testes no ambiente sandbox do Hotmart.
 * Permite testar webhooks sem afetar dados reais.
 * 
 * Documentação Hotmart Sandbox:
 * https://developers.hotmart.com/docs/pt-BR/start/sandbox
 * 
 * Configuração no Hotmart Sandbox:
 * URL: https://clicksehub.com/api/webhooks/hotmart/sandbox
 * 
 * Diferenças do endpoint real:
 * - Validação HMAC opcional (para facilitar testes)
 * - Logs mais detalhados com prefixo [SANDBOX]
 * - Pode processar tanto webhooks reais do sandbox quanto payloads mockados
 */
export async function POST(request: NextRequest) {
  try {
    // Obter o body como texto primeiro (para validação HMAC)
    const bodyText = await request.text();
    let payload: any;
    
    try {
      payload = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('❌ [SANDBOX] Erro ao fazer parse do JSON:', parseError);
      return NextResponse.json(
        { error: 'Payload JSON inválido' },
        { status: 400 }
      );
    }

    // Usar repositórios Admin que bypassam as regras de segurança do Firestore
    const userRepo = new AdminUserRepository();
    const planoRepo = new AdminPlanoRepository();
    const assinaturaRepo = new AdminAssinaturaRepository();
    const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
    const planoService = new PlanoService(planoRepo, undefined, assinaturaRepo, undefined, assinaturaService);
    const service = new HotmartWebhookService(assinaturaRepo, planoRepo, userRepo, planoService, assinaturaService);

    // Obter assinatura HMAC do header
    const signature = request.headers.get('x-hotmart-hmac-sha256') || '';
    
    // Obter secret da variável de ambiente (pode ser diferente para sandbox)
    const secret = process.env.HOTMART_WEBHOOK_SECRET_SANDBOX || process.env.HOTMART_WEBHOOK_SECRET || '';
    const validateHmac = process.env.HOTMART_VALIDATE_HMAC_SANDBOX === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';


    // Validar HMAC apenas se explicitamente habilitado para sandbox
    // Por padrão, desabilitado para facilitar testes locais
    if (validateHmac && secret) {
      if (!signature) {
        console.warn('⚠️ [SANDBOX] Webhook sem assinatura HMAC no header (permitindo para testes)');
        // Não bloquear no sandbox, apenas avisar
      } else {
        // Validar usando o body como texto (ordem original preservada)
        const isValid = service.validarAssinatura(bodyText, signature, secret);
        
        if (!isValid) {
          console.error('❌ [SANDBOX] Webhook HMAC inválido (permitindo para testes)');
          // No sandbox, podemos permitir mesmo com HMAC inválido para facilitar testes
          // Em produção real, isso seria bloqueado
        } else {
          console.log('✅ [SANDBOX] HMAC válido');
        }
      }
    } else {
      console.warn('⚠️ [SANDBOX] Validação HMAC desabilitada (modo teste)');
    }

    // Marcar como sandbox no processamento
    console.log('🧪 [SANDBOX] Processando webhook de teste');
    
    // Processar webhook (mesmo serviço, mas com logs diferenciados)
    const result = await service.processarWebhook(payload, true); // true = modo sandbox

    if (!result.success) {
      console.error('❌ [SANDBOX] Erro ao processar webhook:', result.message);
      return NextResponse.json(
        { 
          error: result.message,
          environment: 'sandbox',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message,
      environment: 'sandbox',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [SANDBOX] Erro ao processar webhook:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao processar webhook',
        environment: 'sandbox'
      },
      { status: 500 }
    );
  }
}

/**
 * GET para testar webhook sandbox mockado
 * 
 * Exemplos:
 * GET /api/webhooks/hotmart/sandbox?email=teste@exemplo.com&plano=BASICO_MENSAL&evento=SUBSCRIPTION_PURCHASE
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const planoCodigo = searchParams.get('plano') || 'BASICO_MENSAL';
    const evento = searchParams.get('evento') || 'SUBSCRIPTION_PURCHASE';

    if (!email) {
      return NextResponse.json({
        error: 'Parâmetro email é obrigatório',
        environment: 'sandbox',
        exemplo: '/api/webhooks/hotmart/sandbox?email=teste@exemplo.com&plano=BASICO_MENSAL&evento=SUBSCRIPTION_PURCHASE',
        eventosDisponiveis: [
          'SUBSCRIPTION_PURCHASE',
          'SUBSCRIPTION_ACTIVATED',
          'SUBSCRIPTION_RENEWED',
          'SUBSCRIPTION_CANCELLED',
          'SUBSCRIPTION_EXPIRED',
          'SUBSCRIPTION_SUSPENDED'
        ]
      }, { status: 400 });
    }

    console.log('🧪 [SANDBOX] Gerando payload mockado para teste');

    // Payload mockado para testes no formato do Hotmart
    const mockPayload = {
      event: evento,
      data: {
        subscription: {
          subscription_code: `SUB-SANDBOX-${Date.now()}`,
          plan: {
            plan_code: planoCodigo,
            name: `Plano ${planoCodigo}`
          },
          buyer: {
            email: email,
            name: 'Usuário Teste Sandbox'
          },
          status: evento === 'SUBSCRIPTION_PURCHASE' ? 'TRIAL' : 
                  evento === 'SUBSCRIPTION_ACTIVATED' ? 'ACTIVE' :
                  evento === 'SUBSCRIPTION_EXPIRED' ? 'EXPIRED' :
                  evento === 'SUBSCRIPTION_CANCELLED' ? 'CANCELLED' :
                  evento === 'SUBSCRIPTION_SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
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
    const result = await service.processarWebhook(mockPayload, true); // true = modo sandbox

    return NextResponse.json({
      success: result.success,
      message: result.message,
      environment: 'sandbox',
      payloadEnviado: mockPayload,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [SANDBOX] Erro ao processar webhook mockado:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao processar webhook',
        environment: 'sandbox'
      },
      { status: 500 }
    );
  }
}

