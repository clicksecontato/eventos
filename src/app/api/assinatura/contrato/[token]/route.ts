import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { s3Service } from '@/lib/s3-service';
import { hashTokenAssinaturaCliente } from '@/lib/services/assinatura-cliente-link-service';
import { createApiResponse, createErrorResponse, handleApiError, getRouteParams } from '@/lib/api/route-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await getRouteParams(params);
    const tokenHash = hashTokenAssinaturaCliente(token);
    const supabase = getSupabaseClient(true) as any;

    const { data: convite, error: conviteError } = await supabase
      .from('contratos_assinatura_convites')
      .select('*')
      .eq('token_hash', tokenHash)
      .limit(1)
      .maybeSingle();

    if (conviteError) {
      return createErrorResponse(`Erro ao validar link: ${conviteError.message}`, 500);
    }
    if (!convite) {
      return createErrorResponse('Link de assinatura não encontrado', 404);
    }
    if (convite.status === 'cancelado') {
      return createErrorResponse('Este link foi cancelado.', 410);
    }
    if (convite.status === 'assinado') {
      return createErrorResponse('Este link já foi utilizado para assinar o contrato.', 409);
    }
    if (new Date(convite.expira_em).getTime() < Date.now()) {
      await supabase
        .from('contratos_assinatura_convites')
        .update({ status: 'expirado' })
        .eq('id', convite.id);
      return createErrorResponse('Este link de assinatura expirou.', 410);
    }

    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('id, numero_contrato, status, pdf_path')
      .eq('id', convite.contrato_id)
      .eq('user_id', convite.user_id)
      .limit(1)
      .maybeSingle();

    if (contratoError) {
      return createErrorResponse(`Erro ao carregar contrato: ${contratoError.message}`, 500);
    }
    if (!contrato || !contrato.pdf_path) {
      return createErrorResponse('Contrato indisponível para assinatura.', 404);
    }

    if (convite.status === 'pendente') {
      await supabase
        .from('contratos_assinatura_convites')
        .update({ status: 'acessado', acessado_em: new Date().toISOString() })
        .eq('id', convite.id);
    }

    const pdfUrl = await s3Service.getSignedUrl(contrato.pdf_path, 3600);
    return createApiResponse({
      contratoId: contrato.id,
      numeroContrato: contrato.numero_contrato,
      statusContrato: contrato.status,
      pdfUrl,
      nomeCliente: convite.nome_destinatario || undefined,
      emailCliente: convite.email_destinatario || undefined,
      expiraEm: convite.expira_em,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

