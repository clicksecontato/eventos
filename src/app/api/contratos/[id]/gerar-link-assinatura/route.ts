import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { getSupabaseClient } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/services/resend-email-service';
import {
  calcularExpiracaoHoras,
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

type BodyGerarLink = {
  emailCliente?: string;
  nomeCliente?: string;
  validadeHoras?: number;
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
    if (!contrato.pdfPath) {
      return createErrorResponse('Gere o PDF do contrato antes de criar o link de assinatura.', 400);
    }

    const token = gerarTokenAssinaturaCliente();
    const tokenHash = hashTokenAssinaturaCliente(token);
    const expiraEm = calcularExpiracaoHoras(body.validadeHoras);
    const link = montarLinkAssinaturaCliente(token, request.url);

    const supabase = getSupabaseClient(true) as any;
    const { data, error } = await supabase
      .from('contratos_assinatura_convites')
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        contrato_id: contrato.id,
        token_hash: tokenHash,
        status: 'pendente',
        expira_em: expiraEm.toISOString(),
        email_destinatario: body.emailCliente?.trim() || null,
        nome_destinatario: body.nomeCliente?.trim() || null,
      })
      .select('*')
      .single();

    if (error) {
      return createErrorResponse(`Erro ao gerar link de assinatura: ${error.message}`, 500);
    }

    let emailEnviado = false;
    let erroEmail: string | undefined;
    if (body.emailCliente?.trim()) {
      const html = templateEmailAssinaturaCliente({
        nomeCliente: body.nomeCliente,
        numeroContrato: contrato.numeroContrato,
        link,
        expiraEm,
      });
      const envio = await sendEmail({
        to: body.emailCliente.trim(),
        subject: `Assinar contrato ${contrato.numeroContrato || ''}`.trim(),
        html,
      });
      emailEnviado = envio.success;
      erroEmail = envio.error;
    }

    return createApiResponse({
      conviteId: data.id,
      link,
      expiraEm: expiraEm.toISOString(),
      emailEnviado,
      erroEmail,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

