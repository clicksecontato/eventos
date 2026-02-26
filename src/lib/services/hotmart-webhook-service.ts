import { AssinaturaRepository } from '../repositories/assinatura-repository';
import { AdminAssinaturaRepository } from '../repositories/admin-assinatura-repository';
import { PlanoRepository } from '../repositories/plano-repository';
import { AdminPlanoRepository } from '../repositories/admin-plano-repository';
import { UserRepository } from '../repositories/user-repository';
import { AdminUserRepository } from '../repositories/admin-user-repository';
import { PlanoService } from './plano-service';
import { AssinaturaService } from './assinatura-service';
import { StatusAssinatura, Assinatura as AssinaturaType, Plano } from '@/types/funcionalidades';
import { UserAssinatura, User } from '@/types';
import crypto from 'crypto';
import { adminAuth } from '@/lib/firebase-admin';
import { syncFirebaseUserToSupabase } from '@/lib/utils/sync-firebase-user-to-supabase';
import { createPasswordResetLink } from './password-link-service';
import { generateFirstAccessEmailTemplate } from './email-service';
import { sendEmail, isEmailServiceConfigured } from './resend-email-service';
import { notificarNovaAquisicaoPlano, notificarCancelamentoPlano } from './admin-notification-service';

export interface HotmartWebhookPayload {
  id?: string;
  creation_date?: number;
  event: string;
  version?: string;
  data?: {
    product?: {
      id?: number;
      name?: string;
    };
    subscriber?: {
      code?: string;
      name?: string;
      email?: string;
      phone?: {
        dddPhone?: string;
        phone?: string;
        dddCell?: string;
        cell?: string;
      };
    };
    subscription?: {
      id?: number;
      code?: string;
      subscription_code?: string;
      plan?: {
        id?: number;
        code?: string;
        plan_code?: string;
        name?: string;
      };
      buyer?: {
        email?: string;
        name?: string;
      };
      subscriber?: {
        email?: string;
        name?: string;
        code?: string;
      };
      status?: string;
      trial?: {
        end_date?: string;
      };
      trial_period_end?: string;
      date_next_charge?: string;
      next_charge_date?: string;
      cancellation_date?: string;
      expiration_date?: string;
    };
    buyer?: {
      email?: string;
      name?: string;
    };
    user?: {
      email?: string;
      name?: string;
    };
    actual_recurrence_value?: number;
    cancellation_date?: number;
    date_next_charge?: number;
    plans?: Array<{
      id?: number;
      name?: string;
      current?: boolean;
      plan_code?: string;
      code?: string;
    }>;
    switch_plan_date?: string;
  };
  subscription?: {
    code?: string;
    subscription_code?: string;
    plan?: {
      code?: string;
      plan_code?: string;
      name?: string;
    };
    buyer?: {
      email?: string;
      name?: string;
    };
    subscriber?: {
      email?: string;
      name?: string;
      code?: string;
    };
    status?: string;
    trial?: {
      end_date?: string;
    };
    trial_period_end?: string;
    date_next_charge?: string;
    next_charge_date?: string;
    cancellation_date?: string;
    expiration_date?: string;
  };
}

export class HotmartWebhookService {
  private assinaturaRepo: AssinaturaRepository | AdminAssinaturaRepository;
  private planoRepo: PlanoRepository | AdminPlanoRepository;
  private userRepo: UserRepository | AdminUserRepository;
  private planoService: PlanoService;
  private assinaturaService: AssinaturaService;

  constructor(
    assinaturaRepo?: AssinaturaRepository | AdminAssinaturaRepository,
    planoRepo?: PlanoRepository | AdminPlanoRepository,
    userRepo?: UserRepository | AdminUserRepository,
    planoService?: PlanoService,
    assinaturaService?: AssinaturaService
  ) {
    // Manter compatibilidade: se não passar dependências, criar novas instâncias
    this.assinaturaRepo = assinaturaRepo || new AssinaturaRepository();
    this.planoRepo = planoRepo || new PlanoRepository();
    this.userRepo = userRepo || new UserRepository();
    this.planoService = planoService || new PlanoService();
    this.assinaturaService = assinaturaService || new AssinaturaService();
  }

  async processarWebhook(payload: any, isSandbox: boolean = false): Promise<{ success: boolean; message: string }> {
    const rawEvent = payload.event;
    // Normalizar nome do evento (evitar diferenças de caixa/variações do sandbox)
    const event = typeof rawEvent === 'string' ? rawEvent.trim().toUpperCase() : '';

    try {
      // Mapeamento para alinhar nomenclatura do Hotmart aos nossos handlers
      // Mantém compatibilidade com SUBSCRIPTION_* e adiciona PURCHASE_*
      const mapEventToAction = (evt: string): 'purchase' | 'activated' | 'renewed' | 'cancelled' | 'expired' | 'suspended' | 'switch_plan' | 'update_charge_date' | 'chargeback' | 'protest' | 'refunded' | 'delayed' | 'unknown' => {
        switch (evt) {
          // Hotmart PURCHASE_* (relevantes para assinatura)
          case 'PURCHASE_APPROVED':
          case 'PURCHASE_COMPLETED':
          case 'PURCHASE_FINISHED':
            return 'purchase';
          case 'PURCHASE_CANCELED':
          case 'PURCHASE_CANCELLED':
            return 'cancelled';
          case 'PURCHASE_EXPIRED':
            return 'expired';
          case 'PURCHASE_CHARGEBACK':
            return 'chargeback';
          case 'PURCHASE_PROTEST':
            return 'protest';
          case 'PURCHASE_REFUNDED':
            return 'refunded';
          case 'PURCHASE_DELAYED':
            return 'delayed';
          // Alguns ambientes enviam atualização/recorrência
          case 'PURCHASE_BILLET_PRINTED':
          case 'PURCHASE_UPDATED':
          case 'PURCHASE_CHARGED':
            // Podemos tratar como 'renewed' quando acompanhadas de subscription.next_charge_date
            return 'renewed';
          // Nomenclatura anterior SUBSCRIPTION_*
          case 'SUBSCRIPTION_PURCHASE':
            return 'purchase';
          case 'SUBSCRIPTION_ACTIVATED':
            return 'activated';
          case 'SUBSCRIPTION_RENEWED':
            return 'renewed';
          case 'SUBSCRIPTION_CANCELLED':
          case 'SUBSCRIPTION_CANCELED':
          case 'SUBSCRIPTION_CANCELLATION':
            return 'cancelled';
          case 'SUBSCRIPTION_EXPIRED':
            return 'expired';
          case 'SUBSCRIPTION_SUSPENDED':
            return 'suspended';
          // Eventos especiais
          case 'SWITCH_PLAN':
            return 'switch_plan';
          case 'UPDATE_SUBSCRIPTION_CHARGE_DATE':
            return 'update_charge_date';
          default:
            return 'unknown';
        }
      };

      // Normalizar estrutura do payload (suportar diferentes formatos do Hotmart)
      let subscription = payload.data?.subscription || payload.subscription;
      
      // Fallback SANDBOX: alguns eventos do sandbox vêm sem data.subscription
      // Ex.: { data: { subscriber: { code }, plan: { id|name }, user: { email } }, event: 'PURCHASE_*' }
      if (!subscription && isSandbox && payload.data) {
        const d = payload.data;
        // Tentar sintetizar um objeto subscription mínimo para nosso fluxo
        const synthesized = {
          subscriber: {
            code: d.subscriber?.code || d.subscriber_code || d.subscription_code || d.id
          },
          plan: {
            // Para webhooks reais, o plano vem como { id: number, name: string }
            id: d.plan?.id,
            name: d.plan?.name,
            plan_code: d.plan?.plan_code || d.plan?.code
          },
          buyer: {
            email: d.user?.email || d.buyer?.email || d.subscriber?.email
          },
          status: d.status || 'ACTIVE',
          date_next_charge: d.next_charge_date || d.date_next_charge
        };
        // Apenas use se houver pelo menos subscription_code e email
        if (synthesized.subscriber?.code && synthesized.buyer.email) {
          subscription = synthesized as any;
        }
      }
      
      if (!subscription) {
        const errorMsg = 'Payload inválido: subscription não encontrado';
        return { success: false, message: errorMsg };
      }

      if (!event) {
        const errorMsg = 'Payload inválido: event não encontrado';
        return { success: false, message: errorMsg };
      }

      // Extrair dados normalizados (suportar diferentes formatos)
      // Preferir campos conforme payload v2 do Hotmart (exemplo enviado):
      // subscription.subscriber.code (ID da assinatura)
      // subscription.plan.id | subscription.plan.name (identificação do plano)
      // buyer.email | user.email
      let hotmartSubscriptionId =
        subscription.subscriber?.code ||
        subscription.subscription_code ||
        subscription.code ||
        payload.data?.subscriber?.code;

      let codigoPlano =
        subscription.plan?.plan_code ||
        subscription.plan?.code ||
        (subscription.plan?.id ? String(subscription.plan.id) : undefined) ||
        (typeof subscription.plan?.name === 'string' ? subscription.plan.name.trim().toUpperCase() : undefined) ||
        (payload.data?.plan?.id ? String(payload.data?.plan?.id) : undefined) ||
        (typeof payload.data?.plan?.name === 'string' ? payload.data?.plan.name.trim().toUpperCase() : undefined);

      // Extrair email de múltiplas fontes possíveis
      const emailRaw = (
        subscription.buyer?.email ||
        payload.data?.buyer?.email ||
        payload.data?.user?.email ||
        payload.data?.subscriber?.email ||
        subscription.subscriber?.email ||
        subscription.user?.email ||
        payload.data?.subscription?.user?.email
      );
      
      const email = emailRaw?.toLowerCase().trim();

      // Log detalhado para debug (especialmente para webhooks reais)
      console.log(`[HotmartWebhook] 🔍 Extraindo código do plano (isSandbox: ${isSandbox}):`);
      console.log(`[HotmartWebhook] - subscription.plan:`, JSON.stringify(subscription.plan, null, 2));
      console.log(`[HotmartWebhook] - payload.data?.plan:`, JSON.stringify(payload.data?.plan, null, 2));
      console.log(`[HotmartWebhook] - codigoPlano extraído (antes fallback):`, codigoPlano);

      // Mapeamento de IDs de planos do Hotmart para códigos do banco
      // Webhooks reais enviam plan.id (numérico) como identificador principal
      const mapeamentoPlanosPorId: Record<string, string> = {
        '1196829': 'BASICO_MENSAL',
        '1197348': 'PROFISSIONAL_MENSAL',
        '1197349': 'PREMIUM_MENSAL',
      };
      
      // Mapeamento de nomes de planos (fallback para sandbox ou casos especiais)
      const mapeamentoPlanosPorNome: Record<string, string> = {
        '123': 'BASICO_MENSAL', // Sandbox
        'BÁSICO': 'BASICO_MENSAL',
        'BASICO': 'BASICO_MENSAL',
        'PROFISSIONAL': 'PROFISSIONAL_MENSAL',
        'PREMIUM': 'PREMIUM_MENSAL',
        'ENTERPRISE': 'ENTERPRISE_MENSAL',
      };
      
      // Aplicar mapeamento por ID primeiro (prioridade)
      if (codigoPlano && mapeamentoPlanosPorId[codigoPlano]) {
        console.log(`[HotmartWebhook] 🔄 Mapeando ID do plano "${codigoPlano}" para "${mapeamentoPlanosPorId[codigoPlano]}"`);
        codigoPlano = mapeamentoPlanosPorId[codigoPlano];
      } else if (codigoPlano && mapeamentoPlanosPorNome[codigoPlano]) {
        // Fallback para mapeamento por nome
        console.log(`[HotmartWebhook] 🔄 Mapeando nome do plano "${codigoPlano}" para "${mapeamentoPlanosPorNome[codigoPlano]}"`);
        codigoPlano = mapeamentoPlanosPorNome[codigoPlano];
      }
      // Fallbacks para shape do Sandbox v2: subscription.subscriber.code e plan.id/name
      if (!hotmartSubscriptionId) {
        hotmartSubscriptionId = subscription.subscriber?.code || subscription.subscriber_code || payload.data?.subscriber?.code;
      }
      if (!codigoPlano) {
        // Se vier id/name apenas, use id; como último recurso, name
        codigoPlano = subscription.plan?.id || subscription.plan?.name || payload.data?.plan?.id || payload.data?.plan?.name;
        if (codigoPlano && typeof codigoPlano !== 'string') {
          codigoPlano = String(codigoPlano);
        }
        console.log(`[HotmartWebhook] - codigoPlano após fallback:`, codigoPlano);
      }
      
      console.log(`[HotmartWebhook] - codigoPlano final:`, codigoPlano);

      if (!hotmartSubscriptionId) {
        const errorMsg = 'Dados incompletos: subscription_id não encontrado';
        return { success: false, message: errorMsg };
      }

      if (!email) {
        const errorMsg = 'Dados incompletos: email não encontrado';
        return { success: false, message: errorMsg };
      }

      // Determinar ação antes de validar plano (alguns eventos não precisam)
      const action = mapEventToAction(event);
      const eventosQueNaoPrecisamPlano = [
        'switch_plan', // SWITCH_PLAN busca o plano do array plans, não de subscription.plan
        'update_charge_date',
        'chargeback',
        'protest',
        'refunded',
        'delayed',
        'cancelled',
        'expired',
        'suspended',
        'activated',
        'renewed'
      ];

      // Buscar usuário por email (necessário para todos os eventos)
      let user = await this.userRepo.findByEmail(email);
      let isNewUser = false;

      // Se não encontrar usuário, vamos tentar pré-cadastrar (especialmente para novas compras)
      if (!user) {
        if (action === 'purchase' || action === 'activated' || action === 'renewed') {
          console.log(`[HotmartWebhook] Usuário não encontrado para o email ${email}. Iniciando pré-cadastro...`);
          try {
            const nome = subscription.buyer?.name || payload.data?.buyer?.name || payload.data?.user?.name || 'Cliente Click-se';
            user = await this.preCadastrarUsuario(email, nome);
            isNewUser = true;
            console.log(`[HotmartWebhook] Pré-cadastro concluído para ${email} (ID: ${user.id})`);
          } catch (preCadastroError: any) {
            console.error(`[HotmartWebhook] Erro ao pré-cadastrar usuário:`, preCadastroError);
            return { 
              success: false, 
              message: `Erro ao processar usuário não cadastrado: ${preCadastroError.message}`
            };
          }
        } else {
          const errorMsg = 'Usuário não encontrado. Verifique se o email está cadastrado no sistema.';
          return { success: false, message: errorMsg };
        }
      }

      // Buscar plano apenas se necessário
      let plano: any = null;
      if (!eventosQueNaoPrecisamPlano.includes(action)) {
        if (!codigoPlano) {
          console.error(`[HotmartWebhook] ❌ Código do plano não encontrado no payload. Action: ${action}`);
          console.error(`[HotmartWebhook] Payload subscription:`, JSON.stringify(subscription, null, 2));
          console.error(`[HotmartWebhook] Payload data:`, JSON.stringify(payload.data, null, 2));
          const errorMsg = 'Dados incompletos: código do plano não encontrado';
          return { success: false, message: errorMsg };
        }

        console.log(`[HotmartWebhook] 🔍 Buscando plano com código Hotmart: "${codigoPlano}"`);
        plano = await this.planoRepo.findByCodigoHotmart(codigoPlano);
        if (!plano) {
          // Tentar buscar todos os planos para debug
          try {
            const todosPlanos = await this.planoRepo.findAll();
            console.error(`[HotmartWebhook] ❌ Plano não encontrado com código: "${codigoPlano}"`);
            console.error(`[HotmartWebhook] Planos disponíveis no banco:`, todosPlanos.map(p => ({ id: p.id, nome: p.nome, codigoHotmart: p.codigoHotmart })));
          } catch (error) {
            console.error(`[HotmartWebhook] Erro ao buscar planos para debug:`, error);
          }
          const errorMsg = `Plano não encontrado com código "${codigoPlano}". Verifique se o código do plano está correto no banco de dados.`;
          return { 
            success: false, 
            message: errorMsg
          };
        }
        console.log(`[HotmartWebhook] ✅ Plano encontrado: ${plano.nome} (ID: ${plano.id}, codigoHotmart: ${plano.codigoHotmart})`);
      }

      // Processar evento
      let result;
      switch (action) {
        case 'purchase':
          result = await this.processarCompra(user.id, plano.id, hotmartSubscriptionId, subscription);
          if (isNewUser || isSandbox) {
            try {
              await this.enviarEmailPrimeiroAcesso(user, plano);
            } catch (err: any) {
              console.error('[HotmartWebhook] Erro ao enviar email de primeiro acesso (webhook segue):', err?.message);
              console.error('[HotmartWebhook] Stack:', err?.stack);
            }
          }
          try {
            await notificarNovaAquisicaoPlano({
              nomeUsuario: user.nome || 'Cliente',
              emailUsuario: user.email,
              nomePlano: plano.nome,
              dataAquisicao: new Date(),
            });
          } catch (err: any) {
            console.error('[HotmartWebhook] Erro ao notificar admin (nova aquisição):', err?.message);
          }
          break;
        case 'activated':
          result = await this.processarAtivacao(hotmartSubscriptionId, subscription);
          break;
        case 'renewed':
          result = await this.processarRenovacao(hotmartSubscriptionId, subscription);
          break;
        case 'cancelled':
          result = await this.processarCancelamento(hotmartSubscriptionId, email);
          break;
        case 'expired':
          result = await this.processarExpiracao(hotmartSubscriptionId, email);
          break;
        case 'suspended':
          result = await this.processarSuspensao(hotmartSubscriptionId);
          break;
        case 'switch_plan':
          // Para SWITCH_PLAN, precisamos buscar o novo plano do payload
          try {
            const novoPlanoCodigo = this.extrairNovoPlanoDoSwitchPlan(payload);
            if (!novoPlanoCodigo) {
              const errorMsg = 'SWITCH_PLAN: Código do novo plano não encontrado no payload';
              return { success: false, message: errorMsg };
            }
            
            const novoPlano = await this.planoRepo.findByCodigoHotmart(novoPlanoCodigo);
            
            if (!novoPlano) {
              const errorMsg = 'SWITCH_PLAN: Novo plano não encontrado. Verifique se o código do plano está correto no banco de dados.';
              return { success: false, message: errorMsg };
            }
            
            if (!novoPlano.id) {
              const errorMsg = 'SWITCH_PLAN: Plano encontrado mas sem ID válido';
              return { success: false, message: errorMsg };
            }
            
            result = await this.processarTrocaPlano(hotmartSubscriptionId, novoPlano.id, payload);
          } catch (error: any) {
            const errorMsg = 'SWITCH_PLAN: Erro ao processar troca de plano';
            return { success: false, message: errorMsg };
          }
          break;
        case 'update_charge_date':
          result = await this.processarAtualizacaoDataCobranca(hotmartSubscriptionId, payload);
          break;
        case 'chargeback':
          result = await this.processarChargeback(hotmartSubscriptionId);
          break;
        case 'protest':
          result = await this.processarProtesto(hotmartSubscriptionId);
          break;
        case 'refunded':
          result = await this.processarReembolso(hotmartSubscriptionId);
          break;
        case 'delayed':
          result = await this.processarPagamentoAtrasado(hotmartSubscriptionId, payload);
          break;
        case 'unknown':
        default:
          const errorMsg = 'Evento não reconhecido ou não suportado';
          return { success: false, message: errorMsg };
      }

      return result;
    } catch (error: any) {
      return { success: false, message: error.message || 'Erro ao processar webhook' };
    }
  }

  private async processarCompra(
    userId: string, 
    planoId: string, 
    hotmartSubscriptionId: string,
    subscription: any
  ): Promise<{ success: boolean; message: string }> {
    const status: StatusAssinatura = subscription.status === 'TRIAL' ? 'trial' : 'active';
    
    await this.planoService.aplicarPlanoUsuario(userId, planoId, hotmartSubscriptionId, status);

    return { 
      success: true, 
      message: `Assinatura criada com sucesso - Status: ${status}` 
    };
  }

  private async processarAtivacao(
    hotmartSubscriptionId: string,
    subscription: any
  ): Promise<{ success: boolean; message: string }> {
    const assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    if (!assinatura) {
      return { success: false, message: 'Assinatura não encontrada' };
    }

    const nextCharge = subscription.date_next_charge || subscription.next_charge_date;
    await this.assinaturaRepo.atualizarStatus(assinatura.id, 'active', {
      dataRenovacao: nextCharge ? new Date(nextCharge) : undefined
    });

    // Sincronizar usando o serviço que já atualiza a estrutura consolidada
    await this.assinaturaService.sincronizarPlanoUsuario(assinatura.userId);

    return { success: true, message: 'Assinatura ativada com sucesso' };
  }

  private async processarCancelamento(
    hotmartSubscriptionId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[HotmartWebhook] 🔄 Processando cancelamento - email: ${email}, hotmartId: ${hotmartSubscriptionId}`);

    // Buscar assinatura primeiro pelo email do usuário
    let assinatura = null;
    
    if (email) {
      const user = await this.userRepo.findByEmail(email.toLowerCase().trim());
      if (user) {
        console.log(`[HotmartWebhook] ✅ Usuário encontrado: ${user.id} (${user.email})`);
        assinatura = await this.assinaturaRepo.findByUserId(user.id);
        if (assinatura) {
          console.log(`[HotmartWebhook] ✅ Assinatura encontrada por userId: ${assinatura.id} (status: ${assinatura.status})`);
        }
      } else {
        console.warn(`[HotmartWebhook] ⚠️ Usuário não encontrado para email: ${email}`);
      }
    }
    
    // Se não encontrou pelo email, tentar pelo hotmartSubscriptionId como fallback
    if (!assinatura && hotmartSubscriptionId) {
      assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
      if (assinatura) {
        console.log(`[HotmartWebhook] ✅ Assinatura encontrada por hotmartId: ${assinatura.id} (status: ${assinatura.status})`);
      }
    }
    
    if (!assinatura) {
      console.error(`[HotmartWebhook] ❌ Assinatura não encontrada - email: ${email}, hotmartId: ${hotmartSubscriptionId}`);
      return { success: false, message: 'Assinatura não encontrada' };
    }

    const statusAnterior = assinatura.status;
    const dataCancelamento = new Date();

    // Adicionar registro específico de cancelamento no histórico ANTES de atualizar o status
    // Isso garante que o histórico seja preservado mesmo após a atualização
    await this.assinaturaRepo.addHistorico(assinatura.id, {
      data: dataCancelamento,
      acao: 'Assinatura cancelada',
      detalhes: {
        statusAnterior,
        statusNovo: 'cancelled',
        motivo: 'Webhook SUBSCRIPTION_CANCELLATION recebido',
        observacao: 'Assinatura mantida ativa até o fim do período pago',
        dataCancelamento: dataCancelamento.toISOString()
      }
    });

    // Cancelar mas manter ativa até o fim do período
    await this.assinaturaRepo.atualizarStatus(assinatura.id, 'cancelled');

    // Sincronizar status no documento do usuário (controle_users)
    await this.assinaturaService.sincronizarPlanoUsuario(assinatura.userId);
    console.log(`[HotmartWebhook] ✅ Cancelamento sincronizado no documento do usuário: ${assinatura.userId}`);

    try {
      const userCancel = await this.userRepo.findById(assinatura.userId);
      const planoCancel = assinatura.planoId ? await this.planoRepo.findById(assinatura.planoId) : null;
      if (userCancel && planoCancel?.nome) {
        await notificarCancelamentoPlano({
          nomeUsuario: userCancel.nome || 'Cliente',
          emailUsuario: userCancel.email,
          nomePlano: planoCancel.nome,
          dataCancelamento,
        });
      }
    } catch (err: any) {
      console.error('[HotmartWebhook] Erro ao notificar admin (cancelamento):', err?.message);
    }

    console.log(`[HotmartWebhook] ✅ Cancelamento processado com sucesso - assinatura: ${assinatura.id}, userId: ${assinatura.userId}`);
    return { success: true, message: 'Assinatura cancelada (mantida ativa até fim do período)' };
  }

  private async processarExpiracao(
    hotmartSubscriptionId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    // Buscar assinatura primeiro pelo email do usuário
    let assinatura = null;
    
    if (email) {
      const user = await this.userRepo.findByEmail(email.toLowerCase().trim());
      if (user) {
        assinatura = await this.assinaturaRepo.findByUserId(user.id);
      }
    }
    
    // Se não encontrou pelo email, tentar pelo hotmartSubscriptionId como fallback
    if (!assinatura && hotmartSubscriptionId) {
      assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    }
    
    if (!assinatura) {
      return { success: false, message: 'Assinatura não encontrada' };
    }

    const statusAnterior = assinatura.status;
    const dataExpiracao = new Date();

    // Adicionar registro específico de expiração no histórico ANTES de atualizar o status
    // Isso garante que o histórico seja preservado mesmo após a atualização
    await this.assinaturaRepo.addHistorico(assinatura.id, {
      data: dataExpiracao,
      acao: 'Assinatura expirada',
      detalhes: {
        statusAnterior,
        statusNovo: 'expired',
        motivo: 'Webhook SUBSCRIPTION_EXPIRED recebido',
        dataExpiracao: dataExpiracao.toISOString()
      }
    });

    // Atualizar status da assinatura (isso também adiciona um registro no histórico via atualizarStatus)
    await this.assinaturaRepo.atualizarStatus(assinatura.id, 'expired', {
      dataFim: dataExpiracao,
      funcionalidadesHabilitadas: []
    });

    // Sincronizar usando o serviço que já atualiza a estrutura consolidada
    await this.assinaturaService.sincronizarPlanoUsuario(assinatura.userId);

    return { success: true, message: 'Assinatura expirada - Funcionalidades desabilitadas' };
  }

  private async processarRenovacao(
    hotmartSubscriptionId: string,
    subscription: any
  ): Promise<{ success: boolean; message: string }> {
    const assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    if (!assinatura) {
      return { success: false, message: 'Assinatura não encontrada' };
    }

    const nextCharge = subscription.date_next_charge || subscription.next_charge_date;
    await this.assinaturaRepo.atualizarStatus(assinatura.id, 'active', {
      dataRenovacao: nextCharge ? new Date(nextCharge) : undefined
    });

    // Sincronizar status no documento do usuário (controle_users)
    await this.assinaturaService.sincronizarPlanoUsuario(assinatura.userId);

    return { success: true, message: 'Assinatura renovada com sucesso' };
  }

  private async processarSuspensao(
    hotmartSubscriptionId: string
  ): Promise<{ success: boolean; message: string }> {
    const assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    if (!assinatura) {
      return { success: false, message: 'Assinatura não encontrada' };
    }

    await this.assinaturaRepo.atualizarStatus(assinatura.id, 'suspended', {
      funcionalidadesHabilitadas: []
    });

    // Sincronizar usando o serviço que já atualiza a estrutura consolidada
    await this.assinaturaService.sincronizarPlanoUsuario(assinatura.userId);

    return { success: true, message: 'Assinatura suspensa - Funcionalidades desabilitadas' };
  }

  private async processarTrocaPlano(
    hotmartSubscriptionId: string,
    novoPlanoId: string,
    payload: any
  ): Promise<{ success: boolean; message: string }> {
    const assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    if (!assinatura) {
      return { success: false, message: 'Assinatura não encontrada' };
    }

    if (!assinatura.id) {
      return { success: false, message: 'Assinatura inválida: sem ID' };
    }

    const novoPlano = await this.planoRepo.findById(novoPlanoId);
    if (!novoPlano) {
      return { success: false, message: 'Novo plano não encontrado' };
    }

    if (!novoPlano.id) {
      return { success: false, message: 'Novo plano inválido: sem ID' };
    }

    if (!novoPlano.nome) {
      return { success: false, message: 'Novo plano inválido: sem nome' };
    }

    if (!novoPlano.codigoHotmart) {
      return { success: false, message: 'Novo plano inválido: sem codigoHotmart' };
    }

    const planoAnterior = assinatura.planoId ? await this.planoRepo.findById(assinatura.planoId) : null;
    const switchPlanDate = payload.data?.switch_plan_date ? new Date(payload.data.switch_plan_date) : new Date();

    // Atualizar assinatura com novo plano
    await this.assinaturaRepo.atualizarStatus(assinatura.id, 'active', {
      planoId: novoPlano.id,
      funcionalidadesHabilitadas: novoPlano.funcionalidades || []
    });

    // Sincronizar usando o serviço que já atualiza a estrutura consolidada
    await this.assinaturaService.sincronizarPlanoUsuario(assinatura.userId);

    // Registrar no histórico
    await this.assinaturaRepo.addHistorico(assinatura.id, {
      data: switchPlanDate,
      acao: 'Troca de plano',
      detalhes: {
        planoAnterior: planoAnterior?.nome || 'N/A',
        planoNovo: novoPlano.nome,
        planoAnteriorId: planoAnterior?.id || null,
        planoNovoId: novoPlano.id
      }
    });

    return { success: true, message: `Plano alterado de ${planoAnterior?.nome || 'N/A'} para ${novoPlano.nome}` };
  }

  private async processarAtualizacaoDataCobranca(
    hotmartSubscriptionId: string,
    payload: any
  ): Promise<{ success: boolean; message: string }> {
    const assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    if (!assinatura) {
      return { success: false, message: 'Assinatura não encontrada' };
    }

    const subscription = payload.data?.subscription || payload.subscription;
    const novaDataCobranca = subscription?.dateNextCharge || subscription?.date_next_charge;
    
    if (!novaDataCobranca) {
      return { success: false, message: 'Nova data de cobrança não encontrada no payload' };
    }

    const dataAnterior = assinatura.dataRenovacao;
    const dataNova = new Date(novaDataCobranca);

    await this.assinaturaRepo.atualizarStatus(assinatura.id, assinatura.status, {
      dataRenovacao: dataNova
    });

    // Registrar no histórico
    await this.assinaturaRepo.addHistorico(assinatura.id, {
      data: new Date(),
      acao: 'Data de cobrança atualizada',
      detalhes: {
        dataAnterior: dataAnterior?.toISOString() || 'N/A',
        dataNova: dataNova.toISOString(),
        oldChargeDay: payload.data?.subscription?.oldChargeDay,
        newChargeDay: payload.data?.subscription?.newChargeDay
      }
    });

    return { success: true, message: `Data de cobrança atualizada para ${dataNova.toLocaleDateString('pt-BR')}` };
  }

  private async processarChargeback(
    hotmartSubscriptionId: string
  ): Promise<{ success: boolean; message: string }> {
    const assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    if (!assinatura) {
      return { success: false, message: 'Assinatura não encontrada' };
    }

    const statusAnterior = assinatura.status;
    const dataChargeback = new Date();

    // Adicionar registro específico de chargeback no histórico ANTES de atualizar o status
    // Isso garante que o histórico seja preservado mesmo após a atualização
    await this.assinaturaRepo.addHistorico(assinatura.id, {
      data: dataChargeback,
      acao: 'Chargeback - Assinatura suspensa',
      detalhes: {
        statusAnterior,
        statusNovo: 'suspended',
        motivo: 'Webhook PURCHASE_CHARGEBACK recebido - Chargeback detectado no pagamento',
        dataChargeback: dataChargeback.toISOString()
      }
    });

    // Suspender imediatamente devido a chargeback
    await this.assinaturaRepo.atualizarStatus(assinatura.id, 'suspended', {
      funcionalidadesHabilitadas: []
    });

    // Sincronizar usando o serviço que já atualiza a estrutura consolidada
    await this.assinaturaService.sincronizarPlanoUsuario(assinatura.userId);

    return { success: true, message: 'Chargeback processado - Assinatura suspensa' };
  }

  private async processarProtesto(
    hotmartSubscriptionId: string
  ): Promise<{ success: boolean; message: string }> {
    const assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    if (!assinatura) {
      return { success: false, message: 'Assinatura não encontrada' };
    }

    const statusAnterior = assinatura.status;
    const dataProtesto = new Date();

    // Adicionar registro específico de protesto no histórico ANTES de atualizar o status
    // Isso garante que o histórico seja preservado mesmo após a atualização
    await this.assinaturaRepo.addHistorico(assinatura.id, {
      data: dataProtesto,
      acao: 'Protesto - Assinatura suspensa',
      detalhes: {
        statusAnterior,
        statusNovo: 'suspended',
        motivo: 'Webhook PURCHASE_PROTEST recebido - Boleto protestado',
        dataProtesto: dataProtesto.toISOString()
      }
    });

    // Suspender devido a protesto
    await this.assinaturaRepo.atualizarStatus(assinatura.id, 'suspended', {
      funcionalidadesHabilitadas: []
    });

    // Sincronizar usando o serviço que já atualiza a estrutura consolidada
    await this.assinaturaService.sincronizarPlanoUsuario(assinatura.userId);

    return { success: true, message: 'Protesto processado - Assinatura suspensa' };
  }

  private async processarReembolso(
    hotmartSubscriptionId: string
  ): Promise<{ success: boolean; message: string }> {
    const assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    if (!assinatura) {
      return { success: false, message: 'Assinatura não encontrada' };
    }

    const statusAnterior = assinatura.status;
    const dataReembolso = new Date();

    // Adicionar registro específico de reembolso no histórico ANTES de atualizar o status
    // Isso garante que o histórico seja preservado mesmo após a atualização
    await this.assinaturaRepo.addHistorico(assinatura.id, {
      data: dataReembolso,
      acao: 'Reembolso - Assinatura cancelada',
      detalhes: {
        statusAnterior,
        statusNovo: 'cancelled',
        motivo: 'Webhook PURCHASE_REFUNDED recebido - Pagamento reembolsado',
        dataReembolso: dataReembolso.toISOString()
      }
    });

    // Cancelar imediatamente devido a reembolso
    await this.assinaturaRepo.atualizarStatus(assinatura.id, 'cancelled', {
      dataFim: dataReembolso,
      funcionalidadesHabilitadas: []
    });

    // Sincronizar usando o serviço que já atualiza a estrutura consolidada
    await this.assinaturaService.sincronizarPlanoUsuario(assinatura.userId);

    return { success: true, message: 'Reembolso processado - Assinatura cancelada' };
  }

  private async processarPagamentoAtrasado(
    hotmartSubscriptionId: string,
    payload: any
  ): Promise<{ success: boolean; message: string }> {
    const assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    if (!assinatura) {
      return { success: false, message: 'Assinatura não encontrada' };
    }

    // Marcar como suspensa temporariamente (pode ser reativada quando pagamento for efetuado)
    // Não removemos funcionalidades imediatamente, apenas suspendemos
    await this.assinaturaRepo.atualizarStatus(assinatura.id, 'suspended');

    // Registrar no histórico
    await this.assinaturaRepo.addHistorico(assinatura.id, {
      data: new Date(),
      acao: 'Pagamento atrasado - Assinatura suspensa temporariamente',
      detalhes: {
        motivo: 'Pagamento em atraso',
        statusAnterior: assinatura.status,
        observacao: 'Assinatura será reativada quando pagamento for confirmado'
      }
    });

    return { success: true, message: 'Pagamento atrasado processado - Assinatura suspensa temporariamente' };
  }

  /**
   * Envia email de boas-vindas + link para definir senha (primeiro acesso pós-compra).
   * Não falha o webhook em caso de erro; apenas registra em log.
   * Garante que o usuário existe no Firebase Auth antes de gerar o link (usuário pode
   * existir só no Firestore, ex.: criado por outro fluxo ou em testes sandbox).
   */
  private async enviarEmailPrimeiroAcesso(user: User, _plano?: Plano | null): Promise<void> {
    console.log('[HotmartWebhook] 📧 enviarEmailPrimeiroAcesso chamado para:', user.email);

    if (!isEmailServiceConfigured()) {
      console.warn('[HotmartWebhook] RESEND_API_KEY não configurada. Email de primeiro acesso não enviado.');
      return;
    }

    // Garantir que o usuário existe no Firebase Auth (createPasswordResetLink exige isso)
    if (adminAuth) {
      try {
        await adminAuth.getUserByEmail(user.email);
      } catch (e: any) {
        if (e?.code === 'auth/user-not-found') {
          console.log('[HotmartWebhook] Usuário não existe no Firebase Auth; criando para permitir o link de senha.');
          await adminAuth.createUser({
            email: user.email,
            displayName: user.nome || 'Cliente',
            emailVerified: true,
          });
        } else {
          throw e;
        }
      }
    }

    let resetUrl: string;
    try {
      const linkResult = await createPasswordResetLink(user.email, { expiryHours: 24 });
      resetUrl = linkResult.resetUrl;
    } catch (err: any) {
      console.error('[HotmartWebhook] Erro ao criar link de senha (createPasswordResetLink):', err?.message, err?.stack);
      return;
    }

    const html = generateFirstAccessEmailTemplate(user.nome || '', resetUrl);
    const r = await sendEmail({
      to: user.email,
      subject: 'Bem-vindo ao Clicksehub! Defina sua senha para acessar',
      html,
      from: 'Clicksehub <noreply@clicksehub.com>'
    });
    if (!r.success) {
      console.error('[HotmartWebhook] Falha ao enviar email de primeiro acesso:', r.error);
    } else {
      console.log('[HotmartWebhook] ✅ Email de primeiro acesso enviado para:', user.email);
    }
  }

  /**
   * Realiza o pré-cadastro de um usuário que comprou via Hotmart mas ainda não tem conta
   */
  private async preCadastrarUsuario(email: string, nome: string): Promise<User> {
    try {
      let firebaseUid: string;

      // 1. Tentar criar ou obter usuário no Firebase Auth usando Admin SDK
      if (adminAuth) {
        try {
          const fbUser = await adminAuth.getUserByEmail(email);
          firebaseUid = fbUser.uid;
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            // Criar usuário sem senha (ele precisará usar "Esqueci minha senha" ou fluxo de primeiro acesso)
            const newUser = await adminAuth.createUser({
              email,
              displayName: nome,
              emailVerified: true // Hotmart já validou o email na compra
            });
            firebaseUid = newUser.uid;
          } else {
            throw error;
          }
        }
      } else {
        // Fallback se adminAuth não estiver disponível (não ideal, mas permite continuar)
        console.warn('[HotmartWebhook] Firebase Admin Auth não disponível. Usando ID gerado localmente.');
        firebaseUid = `TMP_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      }

      // 2. Criar registro no Firestore (controle_users)
      const userData: Omit<User, 'id'> = {
        email,
        nome,
        role: 'user',
        ativo: true,
        dataCadastro: new Date(),
        dataAtualizacao: new Date()
      };

      // Usar setWithId para garantir que o ID do Firestore seja o mesmo do Firebase Auth
      const user = await this.userRepo.setWithId(firebaseUid, userData);

      // 3. Sincronizar com Supabase
      try {
        await syncFirebaseUserToSupabase(firebaseUid, email, nome, 'user');
      } catch (syncError) {
        console.error('[HotmartWebhook] Erro ao sincronizar pré-cadastro com Supabase:', syncError);
        // Continuamos mesmo com erro de sincronização
      }

      return user;
    } catch (error: any) {
      console.error('[HotmartWebhook] Erro no fluxo de pré-cadastro:', error);
      throw new Error(`Falha ao criar conta para novo comprador: ${error.message}`);
    }
  }

  /**
   * Extrai o código do novo plano do payload SWITCH_PLAN
   */
  private extrairNovoPlanoDoSwitchPlan(payload: any): string | null {
    const plans = payload.data?.plans || [];
    // Encontrar o plano marcado como current: true
    const planoAtual = plans.find((p: any) => p.current === true);
    
    if (planoAtual) {
      // Tentar extrair código do plano
      return planoAtual.name || 
             planoAtual.id?.toString() || 
             planoAtual.plan_code || 
             planoAtual.code || 
             null;
    }
    
    // Se não encontrar, tentar pelo primeiro plano da lista
    if (plans.length > 0) {
      const primeiroPlano = plans[0];
      return primeiroPlano.name || 
             primeiroPlano.id?.toString() || 
             primeiroPlano.plan_code || 
             primeiroPlano.code || 
             null;
    }
    
    return null;
  }

  /**
   * Valida a assinatura HMAC SHA256 do webhook do Hotmart
   * Segundo a documentação oficial: https://developers.hotmart.com/docs/pt-BR/tutorials/use-webhook-for-subscriptions/
   * O Hotmart envia o HMAC no header 'x-hotmart-hmac-sha256' e precisamos recalcular usando o secret
   * O HMAC é calculado sobre o body RAW (string JSON original)
   */
  validarAssinatura(payloadBody: string, signature: string, secret: string): boolean {
    try {
      if (!signature || !secret) {
        return false;
      }

      // Segundo a documentação do Hotmart, o HMAC é calculado sobre o body RAW
      // Não fazer JSON.stringify novamente, usar o body como recebido
      const payloadString = typeof payloadBody === 'string' 
        ? payloadBody 
        : JSON.stringify(payloadBody);
      
      // Criar HMAC SHA256 (conforme documentação oficial do Hotmart)
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payloadString, 'utf8');
      const expectedSignature = hmac.digest('hex');
      
      // O Hotmart envia a assinatura em hexadecimal
      // Comparar assinaturas (comparação segura contra timing attacks)
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      
      // Verificar se os tamanhos são iguais antes de comparar
      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error: any) {
      return false;
    }
  }
}

