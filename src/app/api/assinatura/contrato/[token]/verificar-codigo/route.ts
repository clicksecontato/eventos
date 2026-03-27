import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  emailsCoincidem,
  hashOtpCodigo,
  hashTokenAssinaturaCliente,
} from '@/lib/services/assinatura-cliente-link-service';
import { createApiResponse, createErrorResponse, getRouteParams, handleApiError } from '@/lib/api/route-helpers';

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await getRouteParams(params);
    const tokenHash = hashTokenAssinaturaCliente(token);
    const supabase = getSupabaseClient(true) as any;

    const body = (await request.json().catch(() => ({}))) as { email?: string; codigo?: string };
    const email = body.email?.trim();
    const codigo = body.codigo?.replace(/\D/g, '').slice(0, 6);

    const { data: convite, error: conviteError } = await supabase
      .from('contratos_assinatura_convites')
      .select('*')
      .eq('token_hash', tokenHash)
      .limit(1)
      .maybeSingle();

    if (conviteError) return createErrorResponse(`Erro ao validar link: ${conviteError.message}`, 500);
    if (!convite) return createErrorResponse('Link de assinatura não encontrado.', 404);
    if (convite.status !== 'pendente' && convite.status !== 'acessado') {
      return createErrorResponse('Este link não está disponível para verificação.', 409);
    }
    if (new Date(convite.expira_em).getTime() < Date.now()) {
      await supabase.from('contratos_assinatura_convites').update({ status: 'expirado' }).eq('id', convite.id);
      return createErrorResponse('Este link expirou.', 410);
    }

    const agora = Date.now();
    if (convite.otp_bloqueado_ate && new Date(convite.otp_bloqueado_ate).getTime() > agora) {
      return createErrorResponse('Verificação temporariamente bloqueada. Tente novamente mais tarde.', 429);
    }

    if (!convite.email_destinatario?.trim()) {
      return createErrorResponse('Este convite não exige código.', 400);
    }
    if (!email || !emailsCoincidem(email, convite.email_destinatario)) {
      return createErrorResponse('E-mail informado não confere com o convite.', 400);
    }
    if (!codigo || codigo.length !== 6) {
      return createErrorResponse('Informe o código de 6 dígitos.', 400);
    }

    if (!convite.otp_codigo_hash || !convite.otp_expira_em) {
      return createErrorResponse('Solicite um novo código antes de verificar.', 400);
    }

    if (new Date(convite.otp_expira_em).getTime() < agora) {
      return createErrorResponse('Código expirado. Solicite um novo.', 410);
    }

    const esperado = hashOtpCodigo(codigo, tokenHash);
    const tentativas = Number(convite.otp_tentativas ?? 0);

    if (esperado !== convite.otp_codigo_hash) {
      const novaTentativa = tentativas + 1;
      let bloqueio: string | null = null;
      if (novaTentativa >= MAX_TENTATIVAS) {
        bloqueio = new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000).toISOString();
      }
      await supabase
        .from('contratos_assinatura_convites')
        .update({
          otp_tentativas: novaTentativa,
          otp_bloqueado_ate: bloqueio,
          data_atualizacao: new Date().toISOString(),
        })
        .eq('id', convite.id);
      return createErrorResponse('Código incorreto.', 400);
    }

    const verificadoEm = new Date().toISOString();
    await supabase
      .from('contratos_assinatura_convites')
      .update({
        otp_verificado_em: verificadoEm,
        otp_codigo_hash: null,
        otp_expira_em: null,
        otp_tentativas: 0,
        otp_bloqueado_ate: null,
        data_atualizacao: verificadoEm,
      })
      .eq('id', convite.id);

    return createApiResponse({
      verificadoEm,
      mensagem: 'E-mail confirmado. Você pode visualizar o documento e assinar.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
