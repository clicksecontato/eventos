import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isResendMockEnabled, sendEmail } from '@/lib/services/resend-email-service';
import {
  calcularExpiracaoHoras,
  calcularHashReferenciaContratoParaConvite,
  gerarTokenAssinaturaCliente,
  hashTokenAssinaturaCliente,
  montarLinkAssinaturaCliente,
  templateEmailAssinaturaCliente,
} from '@/lib/services/assinatura-cliente-link-service';
import {
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRouteParams,
} from '@/lib/api/route-helpers';
import { registrarEventoAuditoriaContrato } from '@/lib/services/contrato-auditoria-service';

type BodyGerarLink = {
  emailCliente?: string;
  nomeCliente?: string;
  validadeHoras?: number;
  /** Se informado, nome/e-mail vêm do cadastro de signatário (Fase 2). */
  signatarioId?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    const body = (await request.json().catch(() => ({}))) as BodyGerarLink;

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(id, user.id);
    if (!contrato) {
      return createErrorResponse('Contrato não encontrado', 404);
    }
    if (contrato.status === 'document_closed') {
      return createErrorResponse('Este contrato está fechado e não aceita novos links.', 409);
    }
    if (!contrato.pdfPath) {
      return createErrorResponse('Gere o PDF do contrato antes de criar o link de assinatura.', 400);
    }

    const parteRepo = repositoryFactory.getContratoParteRepository();
    const arvorePartes = await parteRepo.listarArvorePorContrato(contrato.id, user.id);
    const totalSignatariosCadastrados = arvorePartes.reduce(
      (acc, p) => acc + (p.signatarios?.length ?? 0),
      0
    );

    const sid = body.signatarioId?.trim();
    if (totalSignatariosCadastrados > 0 && !sid) {
      return createErrorResponse(
        'Este contrato possui signatários cadastrados nas partes. Gere o link escolhendo um signatário (não é permitido link genérico por nome/e-mail).',
        400
      );
    }

    let nomeCliente = body.nomeCliente?.trim() || '';
    let emailCliente = body.emailCliente?.trim() || '';
    let signatarioIdGravacao: string | null = null;

    if (sid) {
      const sig = await parteRepo.buscarSignatario(sid, user.id);
      if (!sig || sig.contratoId !== contrato.id) {
        return createErrorResponse('Signatário não encontrado neste contrato.', 404);
      }
      if (sig.status === 'assinado') {
        return createErrorResponse(
          'Este signatário já assinou o contrato. Não é possível gerar novo link de assinatura para a mesma pessoa.',
          400
        );
      }
      nomeCliente = sig.nome;
      emailCliente = sig.email;
      signatarioIdGravacao = sig.id;
    } else {
      if (nomeCliente.length < 2) {
        return createErrorResponse('Informe o nome do cliente (mínimo 2 caracteres).', 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCliente)) {
        return createErrorResponse('Informe um e-mail válido do signatário. Ele receberá o código de confirmação.', 400);
      }
    }

    const contratoRefHash = calcularHashReferenciaContratoParaConvite({
      id: contrato.id,
      pdfPath: contrato.pdfPath,
      dataAtualizacao: contrato.dataAtualizacao,
    });

    const supabase = getSupabaseClient(true) as any;

    if (signatarioIdGravacao) {
      const agoraIso = new Date().toISOString();
      const { error: revErr } = await supabase
        .from('contratos_assinatura_convites')
        .update({ status: 'cancelado', data_atualizacao: agoraIso })
        .eq('user_id', user.id)
        .eq('contrato_id', contrato.id)
        .eq('signatario_id', signatarioIdGravacao)
        .in('status', ['pendente', 'acessado']);
      if (revErr) {
        console.warn('[gerar-link-assinatura] revogar convites anteriores do signatário:', revErr.message);
      }
    }

    const token = gerarTokenAssinaturaCliente();
    const tokenHash = hashTokenAssinaturaCliente(token);
    const expiraEm = calcularExpiracaoHoras(body.validadeHoras);
    const link = montarLinkAssinaturaCliente(token, request.url);

    const insertRow: Record<string, unknown> = {
      id: crypto.randomUUID(),
      user_id: user.id,
      contrato_id: contrato.id,
      token_hash: tokenHash,
      status: 'pendente',
      expira_em: expiraEm.toISOString(),
      email_destinatario: emailCliente,
      nome_destinatario: nomeCliente,
      contrato_ref_hash: contratoRefHash,
    };
    if (signatarioIdGravacao) {
      insertRow.signatario_id = signatarioIdGravacao;
    }

    const { data, error } = await supabase
      .from('contratos_assinatura_convites')
      .insert(insertRow)
      .select('*')
      .single();

    if (error) {
      return createErrorResponse(`Erro ao gerar link de assinatura: ${error.message}`, 500);
    }

    if (signatarioIdGravacao) {
      try {
        await parteRepo.atualizarSignatario(signatarioIdGravacao, user.id, { status: 'convite_enviado' });
      } catch (e) {
        console.warn('[gerar-link-assinatura] não foi possível atualizar status do signatário:', e);
      }
    }

    let emailEnviado = false;
    let erroEmail: string | undefined;
    const html = templateEmailAssinaturaCliente({
      nomeCliente: nomeCliente,
      numeroContrato: contrato.numeroContrato,
      link,
      expiraEm,
    });
    const envio = await sendEmail({
      to: emailCliente,
      subject: `Assinar contrato ${contrato.numeroContrato || ''}`.trim(),
      html,
    });
    emailEnviado = envio.success && !isResendMockEnabled();
    erroEmail = envio.error;
    if (isResendMockEnabled() && envio.success) {
      console.log('\n┌──────────────────────────────────────────────────');
      console.log('│ [MOCK] Link de assinatura (e-mail não enviado):');
      console.log('│', link);
      console.log('└──────────────────────────────────────────────────\n');
    }

    await registrarEventoAuditoriaContrato({
      contratoId: contrato.id,
      userId: user.id,
      actorUserId: user.id,
      tipo: 'convite_link_criado',
      payload: {
        conviteId: data.id,
        emailDestinatario: emailCliente,
        nomeDestinatario: nomeCliente,
        emailEnviado,
        signatarioId: signatarioIdGravacao,
      },
    });

    return createApiResponse({
      conviteId: data.id,
      link,
      expiraEm: expiraEm.toISOString(),
      emailEnviado,
      erroEmail,
      resendMock: isResendMockEnabled(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

