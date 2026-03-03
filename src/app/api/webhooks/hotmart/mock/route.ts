import { NextRequest, NextResponse } from 'next/server';
import { HotmartWebhookService } from '@/lib/services/hotmart-webhook-service';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { PlanoService } from '@/lib/services/plano-service';

function isHotmartEnabled(): boolean {
  return process.env.HOTMART_ENABLED === 'true';
}

/**
 * Endpoint Mock para Webhooks Hotmart
 * 
 * Este endpoint permite simular webhooks da Hotmart para testes locais
 * sem precisar usar o sandbox ou produção.
 * 
 * Uso via Postman:
 * POST /api/webhooks/hotmart/mock?event=SWITCH_PLAN&email=usuario@exemplo.com
 * 
 * Eventos suportados:
 * - PURCHASE_APPROVED
 * - SUBSCRIPTION_ACTIVATED
 * - SUBSCRIPTION_RENEWED
 * - SUBSCRIPTION_CANCELLATION
 * - SUBSCRIPTION_EXPIRED
 * - SUBSCRIPTION_SUSPENDED
 * - SWITCH_PLAN
 * - UPDATE_SUBSCRIPTION_CHARGE_DATE
 * - PURCHASE_CHARGEBACK
 * - PURCHASE_PROTEST
 * - PURCHASE_REFUNDED
 * - PURCHASE_DELAYED
 */
export async function POST(request: NextRequest) {
  try {
    if (!isHotmartEnabled()) {
      return NextResponse.json(
        { error: 'Integração Hotmart desativada neste ambiente.' },
        { status: 410 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('event') || 'PURCHASE_APPROVED';
    const email = searchParams.get('email');
    const subscriptionCode = searchParams.get('subscription_code') || `MOCK_${Date.now()}`;
    const planCode = searchParams.get('plan_code') || 'BASICO_MENSAL';
    const newPlanCode = searchParams.get('new_plan_code'); // Para SWITCH_PLAN
    const newChargeDate = searchParams.get('new_charge_date'); // Para UPDATE_SUBSCRIPTION_CHARGE_DATE

    if (!email) {
      return NextResponse.json(
        { error: 'Parâmetro email é obrigatório. Use ?email=usuario@exemplo.com' },
        { status: 400 }
      );
    }

    // Usar repositórios Admin que bypassam as regras de segurança do Firestore
    const userRepo = repositoryFactory.getAdminUserRepository();
    const planoRepo = repositoryFactory.getAdminPlanoRepository();
    const assinaturaRepo = repositoryFactory.getAdminAssinaturaRepository();
    const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
    const planoService = new PlanoService(planoRepo, undefined, assinaturaRepo, undefined, assinaturaService);
    const service = new HotmartWebhookService(assinaturaRepo, planoRepo, userRepo, planoService, assinaturaService);

    // Gerar payload mock baseado no tipo de evento
    let payload: any;

    switch (eventType.toUpperCase()) {
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_COMPLETE':
        payload = {
          id: `mock-${Date.now()}`,
          creation_date: Date.now(),
          event: eventType.toUpperCase(),
          version: '2.0.0',
          data: {
            subscription: {
              subscriber: {
                code: subscriptionCode
              },
              plan: {
                plan_code: planCode,
                name: planCode
              },
              status: 'ACTIVE',
              date_next_charge: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            buyer: {
              email: email
            }
          }
        };
        break;

      case 'SUBSCRIPTION_ACTIVATED':
        payload = {
          id: `mock-${Date.now()}`,
          creation_date: Date.now(),
          event: 'SUBSCRIPTION_ACTIVATED',
          version: '2.0.0',
          data: {
            subscription: {
              subscriber: {
                code: subscriptionCode,
                email: email
              },
              status: 'ACTIVE',
              date_next_charge: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            buyer: {
              email: email
            }
          }
        };
        break;

      case 'SUBSCRIPTION_RENEWED':
        payload = {
          id: `mock-${Date.now()}`,
          creation_date: Date.now(),
          event: 'SUBSCRIPTION_RENEWED',
          version: '2.0.0',
          data: {
            subscription: {
              subscriber: {
                code: subscriptionCode,
                email: email
              },
              status: 'ACTIVE',
              date_next_charge: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            buyer: {
              email: email
            }
          }
        };
        break;

      case 'SUBSCRIPTION_CANCELLATION':
      case 'PURCHASE_CANCELED':
        // Buscar dados reais do banco
        {
          const userRepo = repositoryFactory.getAdminUserRepository();
          const assinaturaRepo = repositoryFactory.getAdminAssinaturaRepository();
          
          // Buscar usuário
          const normalizedEmail = email.toLowerCase().trim();
          const user = await userRepo.findByEmail(normalizedEmail);
          if (!user) {
            return NextResponse.json(
              { error: `Usuário não encontrado com o email: ${email}` },
              { status: 404 }
            );
          }
          
          // Buscar todas as assinaturas do usuário e pegar a mais recente
          // (para cancelamento, precisamos encontrar mesmo que não esteja ativa)
          const todasAssinaturas = await assinaturaRepo.findAllByUserId(user.id);
          const assinatura = todasAssinaturas.length > 0 ? todasAssinaturas[0] : null;
          if (!assinatura) {
            return NextResponse.json(
              { error: `Usuário não possui assinatura. Crie uma assinatura primeiro.` },
              { status: 404 }
            );
          }
          
          if (!assinatura.hotmartSubscriptionId) {
            return NextResponse.json(
              { error: `Assinatura não possui hotmartSubscriptionId válido` },
              { status: 400 }
            );
          }
          
          payload = {
            id: `mock-${Date.now()}`,
            creation_date: Date.now(),
            event: eventType.toUpperCase(),
            version: '2.0.0',
            data: {
              cancellation_date: Date.now(),
              subscriber: {
                code: assinatura.hotmartSubscriptionId,
                name: user.nome || 'User name',
                email: email,
                phone: {
                  dddPhone: '',
                  phone: '',
                  dddCell: '',
                  cell: ''
                }
              },
              subscription: {
                id: 4148584
              }
            }
          };
        }
        break;

      case 'SUBSCRIPTION_EXPIRED':
      case 'PURCHASE_EXPIRED':
        // Buscar dados reais do banco
        {
          const userRepo = repositoryFactory.getAdminUserRepository();
          const assinaturaRepo = repositoryFactory.getAdminAssinaturaRepository();
          
          // Buscar usuário
          const normalizedEmail = email.toLowerCase().trim();
          const user = await userRepo.findByEmail(normalizedEmail);
          if (!user) {
            return NextResponse.json(
              { error: `Usuário não encontrado com o email: ${email}` },
              { status: 404 }
            );
          }
          
          // Buscar todas as assinaturas do usuário e pegar a mais recente
          // (para expiração, precisamos encontrar mesmo que já esteja expirada)
          const todasAssinaturas = await assinaturaRepo.findAllByUserId(user.id);
          const assinatura = todasAssinaturas.length > 0 ? todasAssinaturas[0] : null;
          if (!assinatura) {
            return NextResponse.json(
              { error: `Usuário não possui assinatura. Crie uma assinatura primeiro.` },
              { status: 404 }
            );
          }
          
          if (!assinatura.hotmartSubscriptionId) {
            return NextResponse.json(
              { error: `Assinatura não possui hotmartSubscriptionId válido` },
              { status: 400 }
            );
          }
          
          payload = {
            id: `mock-${Date.now()}`,
            creation_date: Date.now(),
            event: eventType.toUpperCase(),
            version: '2.0.0',
            data: {
              expiration_date: new Date().toISOString(),
              subscriber: {
                code: assinatura.hotmartSubscriptionId,
                name: user.nome || 'User name',
                email: email,
                phone: {
                  dddPhone: '',
                  phone: '',
                  dddCell: '',
                  cell: ''
                }
              },
              subscription: {
                id: 4148584
              }
            }
          };
        }
        break;

      case 'SUBSCRIPTION_SUSPENDED':
        payload = {
          id: `mock-${Date.now()}`,
          creation_date: Date.now(),
          event: 'SUBSCRIPTION_SUSPENDED',
          version: '2.0.0',
          data: {
            subscription: {
              subscriber: {
                code: subscriptionCode,
                email: email
              },
              status: 'SUSPENDED'
            },
            buyer: {
              email: email
            }
          }
        };
        break;

      case 'SWITCH_PLAN':
        if (!newPlanCode) {
          return NextResponse.json(
            { error: 'Para SWITCH_PLAN, é necessário fornecer new_plan_code. Use ?new_plan_code=PROFISSIONAL_MENSAL' },
            { status: 400 }
          );
        }
        
        // Buscar dados reais do banco
        const userRepo = repositoryFactory.getAdminUserRepository();
        const assinaturaRepo = repositoryFactory.getAdminAssinaturaRepository();
        const planoRepo = repositoryFactory.getAdminPlanoRepository();
        
        // Buscar usuário
        const normalizedEmail = email.toLowerCase().trim();
        const user = await userRepo.findByEmail(normalizedEmail);
        if (!user) {
          return NextResponse.json(
            { error: `Usuário não encontrado com o email: ${email}` },
            { status: 404 }
          );
        }
        
        // Buscar assinatura ativa do usuário
        const assinatura = await assinaturaRepo.findByUserId(user.id);
        if (!assinatura) {
          return NextResponse.json(
            { error: `Usuário não possui assinatura ativa. Crie uma assinatura primeiro.` },
            { status: 404 }
          );
        }
        
        // Buscar plano atual da assinatura
        let planoAtual = null;
        if (assinatura.planoId) {
          try {
            planoAtual = await planoRepo.findById(assinatura.planoId);
            if (!planoAtual || !planoAtual.id) {
              console.warn(`⚠️ [MOCK] Plano atual não encontrado ou inválido para planoId: ${assinatura.planoId}`);
              planoAtual = null;
            }
          } catch (error) {
            console.warn(`⚠️ [MOCK] Erro ao buscar plano atual:`, error);
            planoAtual = null;
          }
        }
        
        // Buscar novo plano pelo código Hotmart
        let novoPlano = null;
        try {
          novoPlano = await planoRepo.findByCodigoHotmart(newPlanCode);
        } catch (error) {
          console.error(`❌ [MOCK] Erro ao buscar novo plano:`, error);
          return NextResponse.json(
            { error: `Erro ao buscar plano com código Hotmart: ${newPlanCode}` },
            { status: 500 }
          );
        }
        
        if (!novoPlano || !novoPlano.id) {
          return NextResponse.json(
            { error: `Plano não encontrado com código Hotmart: ${newPlanCode}. Verifique se o plano existe no banco de dados.` },
            { status: 404 }
          );
        }
        
        // Validar campos obrigatórios
        if (!novoPlano.codigoHotmart) {
          return NextResponse.json(
            { error: `Plano encontrado mas sem código Hotmart válido: ${newPlanCode}` },
            { status: 400 }
          );
        }
        
        if (!assinatura.hotmartSubscriptionId) {
          return NextResponse.json(
            { error: `Assinatura não possui hotmartSubscriptionId válido` },
            { status: 400 }
          );
        }
        
        // Montar array de planos
        const plansArray: any[] = [];
        
        // Adicionar plano anterior (se existir e tiver dados válidos)
        if (planoAtual && planoAtual.id && planoAtual.codigoHotmart) {
          plansArray.push({
            id: planoAtual.id,
            name: planoAtual.codigoHotmart,
            plan_code: planoAtual.codigoHotmart,
            code: planoAtual.codigoHotmart,
            current: false
          });
        }
        
        // Adicionar novo plano (sempre marcado como current)
        plansArray.push({
          id: novoPlano.id,
          name: novoPlano.codigoHotmart,
          plan_code: novoPlano.codigoHotmart,
          code: novoPlano.codigoHotmart,
          current: true
        });
        
        // Montar payload com dados reais
        payload = {
          id: `mock-${Date.now()}`,
          creation_date: Date.now(),
          event: 'SWITCH_PLAN',
          version: '2.0.0',
          data: {
            switch_plan_date: Date.now(),
            subscription: {
              subscriber_code: assinatura.hotmartSubscriptionId,
              subscriber: {
                code: assinatura.hotmartSubscriptionId,
                email: email
              },
              status: 'ACTIVE',
              user: {
                email: email
              }
            },
            buyer: {
              email: email
            },
            plans: plansArray
          }
        };
        
        console.log(`🧪 [MOCK] SWITCH_PLAN - Dados reais:`, {
          userId: user.id,
          assinaturaId: assinatura.id,
          subscriptionId: assinatura.hotmartSubscriptionId,
          planoAtual: planoAtual?.codigoHotmart || 'N/A',
          novoPlano: novoPlano.codigoHotmart,
          plansCount: plansArray.length
        });
        break;

      case 'UPDATE_SUBSCRIPTION_CHARGE_DATE':
        const chargeDate = newChargeDate 
          ? new Date(newChargeDate).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        payload = {
          id: `mock-${Date.now()}`,
          creationDate: Date.now(),
          event: 'UPDATE_SUBSCRIPTION_CHARGE_DATE',
          version: '2.0.0',
          data: {
            subscription: {
              dateNextCharge: chargeDate,
              newChargeDay: new Date(chargeDate).getDate(),
              oldChargeDay: new Date().getDate(),
              status: 'ACTIVE'
            },
            subscriber: {
              code: subscriptionCode,
              email: email
            },
            plan: {
              name: planCode
            }
          }
        };
        break;

      case 'PURCHASE_CHARGEBACK':
        payload = {
          id: `mock-${Date.now()}`,
          creation_date: Date.now(),
          event: 'PURCHASE_CHARGEBACK',
          version: '2.0.0',
          data: {
            subscription: {
              subscriber: {
                code: subscriptionCode,
                email: email
              },
              status: 'SUSPENDED'
            },
            purchase: {
              status: 'CHARGEBACK',
              transaction: `HP${Date.now()}`
            },
            buyer: {
              email: email
            }
          }
        };
        break;

      case 'PURCHASE_PROTEST':
        payload = {
          id: `mock-${Date.now()}`,
          creation_date: Date.now(),
          event: 'PURCHASE_PROTEST',
          version: '2.0.0',
          data: {
            subscription: {
              subscriber: {
                code: subscriptionCode,
                email: email
              },
              status: 'SUSPENDED'
            },
            purchase: {
              status: 'PROTEST',
              transaction: `HP${Date.now()}`
            },
            buyer: {
              email: email
            }
          }
        };
        break;

      case 'PURCHASE_REFUNDED':
        payload = {
          id: `mock-${Date.now()}`,
          creation_date: Date.now(),
          event: 'PURCHASE_REFUNDED',
          version: '2.0.0',
          data: {
            subscription: {
              subscriber: {
                code: subscriptionCode,
                email: email
              },
              status: 'CANCELLED'
            },
            purchase: {
              status: 'REFUNDED',
              transaction: `HP${Date.now()}`
            },
            buyer: {
              email: email
            }
          }
        };
        break;

      case 'PURCHASE_DELAYED':
        payload = {
          id: `mock-${Date.now()}`,
          creation_date: Date.now(),
          event: 'PURCHASE_DELAYED',
          version: '2.0.0',
          data: {
            subscription: {
              subscriber: {
                code: subscriptionCode,
                email: email
              },
              status: 'SUSPENDED'
            },
            purchase: {
              status: 'DELAYED',
              transaction: `HP${Date.now()}`
            },
            buyer: {
              email: email
            }
          }
        };
        break;

      default:
        return NextResponse.json(
          { error: `Evento não suportado: ${eventType}. Eventos disponíveis: PURCHASE_APPROVED, SUBSCRIPTION_ACTIVATED, SUBSCRIPTION_RENEWED, SUBSCRIPTION_CANCELLATION, SUBSCRIPTION_EXPIRED, SUBSCRIPTION_SUSPENDED, SWITCH_PLAN, UPDATE_SUBSCRIPTION_CHARGE_DATE, PURCHASE_CHARGEBACK, PURCHASE_PROTEST, PURCHASE_REFUNDED, PURCHASE_DELAYED` },
          { status: 400 }
        );
    }

    console.log('🧪 [MOCK] Processando webhook simulado:', {
      event: eventType,
      email,
      subscriptionCode,
      planCode
    });

    // Processar webhook (isSandbox=true para logs diferenciados)
    const result = await service.processarWebhook(payload, true);

    if (!result.success) {
      console.error('❌ [MOCK] Erro ao processar webhook:', result.message);
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      event: eventType,
      payload: payload
    });

  } catch (error: any) {
    console.error('❌ [MOCK] Erro ao processar webhook mock:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook mock' },
      { status: 500 }
    );
  }
}

// GET para listar eventos disponíveis
export async function GET() {
  if (!isHotmartEnabled()) {
    return NextResponse.json(
      { error: 'Integração Hotmart desativada neste ambiente.' },
      { status: 410 }
    );
  }

  return NextResponse.json({
    message: 'Endpoint Mock para Webhooks Hotmart',
    usage: 'POST /api/webhooks/hotmart/mock?event=EVENT_TYPE&email=usuario@exemplo.com',
    parameters: {
      event: 'Tipo de evento (obrigatório)',
      email: 'Email do usuário (obrigatório)',
      subscription_code: 'Código da assinatura (opcional, gera automaticamente)',
      plan_code: 'Código do plano atual (opcional, padrão: BASICO_MENSAL)',
      new_plan_code: 'Código do novo plano (obrigatório para SWITCH_PLAN)',
      new_charge_date: 'Nova data de cobrança ISO (opcional para UPDATE_SUBSCRIPTION_CHARGE_DATE)'
    },
    availableEvents: [
      'PURCHASE_APPROVED',
      'PURCHASE_COMPLETE',
      'SUBSCRIPTION_ACTIVATED',
      'SUBSCRIPTION_RENEWED',
      'SUBSCRIPTION_CANCELLATION',
      'PURCHASE_CANCELED',
      'SUBSCRIPTION_EXPIRED',
      'PURCHASE_EXPIRED',
      'SUBSCRIPTION_SUSPENDED',
      'SWITCH_PLAN',
      'UPDATE_SUBSCRIPTION_CHARGE_DATE',
      'PURCHASE_CHARGEBACK',
      'PURCHASE_PROTEST',
      'PURCHASE_REFUNDED',
      'PURCHASE_DELAYED'
    ],
    examples: {
      purchase: 'POST /api/webhooks/hotmart/mock?event=PURCHASE_APPROVED&email=usuario@exemplo.com&plan_code=PROFISSIONAL_MENSAL',
      switchPlan: 'POST /api/webhooks/hotmart/mock?event=SWITCH_PLAN&email=usuario@exemplo.com&new_plan_code=PREMIUM_MENSAL',
      updateChargeDate: 'POST /api/webhooks/hotmart/mock?event=UPDATE_SUBSCRIPTION_CHARGE_DATE&email=usuario@exemplo.com&new_charge_date=2025-02-15T00:00:00.000Z',
      chargeback: 'POST /api/webhooks/hotmart/mock?event=PURCHASE_CHARGEBACK&email=usuario@exemplo.com'
    }
  });
}

