import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isResendMockEnabled, sendEmail } from '@/lib/services/resend-email-service';
import {
  emailsCoincidem,
  gerarCodigoOtp6Digitos,
  hashOtpCodigo,
  hashTokenAssinaturaCliente,
  templateEmailOtpAssinaturaCliente,
} from '@/lib/services/assinatura-cliente-link-service';
import { createApiResponse, createErrorResponse, getRouteParams, handleApiError } from '@/lib/api/route-helpers';

const MIN_SEGUNDOS_ENTRE_ENVIOS = 60;
const OTP_VALIDADE_MINUTOS = 15;
const LIMITE_ENVIOS_TOTAL = 12;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await getRouteParams(params);
    const tokenHash = hashTokenAssinaturaCliente(token);
    const supabase = getSupabaseClient(true) as any;

    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim();

    const { data: convite, error: conviteError } = await supabase
      .from('contratos_assinatura_convites')
      .select('*')
      .eq('token_hash', tokenHash)
      .limit(1)
      .maybeSingle();

    if (conviteError) return createErrorResponse(`Erro ao validar link: ${conviteError.message}`, 500);
    if (!convite) return createErrorResponse('Link de assinatura não encontrado.', 404);
    if (convite.status === 'cancelado') return createErrorResponse('Este link foi cancelado.', 410);
    if (convite.status === 'assinado') return createErrorResponse('Este link já foi utilizado.', 409);
    if (new Date(convite.expira_em).getTime() < Date.now()) {
      await supabase.from('contratos_assinatura_convites').update({ status: 'expirado' }).eq('id', convite.id);
      return createErrorResponse('Este link expirou.', 410);
    }

    if (!convite.email_destinatario?.trim()) {
      return createErrorResponse('Este convite não exige código por e-mail.', 400);
    }

    if (!email || !emailsCoincidem(email, convite.email_destinatario)) {
      return createErrorResponse('O e-mail informado não confere com o convite.', 400);
    }

    const agora = Date.now();
    if (convite.otp_bloqueado_ate && new Date(convite.otp_bloqueado_ate).getTime() > agora) {
      return createErrorResponse('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.', 429);
    }

    if (convite.otp_ultimo_envio_em) {
      const ultimo = new Date(convite.otp_ultimo_envio_em).getTime();
      if (agora - ultimo < MIN_SEGUNDOS_ENTRE_ENVIOS * 1000) {
        return createErrorResponse(
          `Aguarde ${MIN_SEGUNDOS_ENTRE_ENVIOS} segundos entre um envio e outro.`,
          429
        );
      }
    }

    const totalEnvios = Number(convite.otp_total_envios ?? 0);
    if (totalEnvios >= LIMITE_ENVIOS_TOTAL) {
      return createErrorResponse('Limite de envios de código para este link foi atingido.', 429);
    }

    const codigo = gerarCodigoOtp6Digitos();
    const otpHash = hashOtpCodigo(codigo, tokenHash);
    const expiraEm = new Date(Date.now() + OTP_VALIDADE_MINUTOS * 60 * 1000).toISOString();

    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('numero_contrato, status')
      .eq('id', convite.contrato_id)
      .eq('user_id', convite.user_id)
      .limit(1)
      .maybeSingle();

    if (contratoError || !contrato) {
      return createErrorResponse('Contrato não encontrado.', 404);
    }

    const { error: updateError } = await supabase
      .from('contratos_assinatura_convites')
      .update({
        otp_codigo_hash: otpHash,
        otp_expira_em: expiraEm,
        otp_ultimo_envio_em: new Date().toISOString(),
        otp_total_envios: totalEnvios + 1,
        data_atualizacao: new Date().toISOString(),
      })
      .eq('id', convite.id);

    if (updateError) {
      return createErrorResponse(`Erro ao registrar código: ${updateError.message}`, 500);
    }

    const html = templateEmailOtpAssinaturaCliente({
      nomeCliente: convite.nome_destinatario || undefined,
      numeroContrato: contrato.numero_contrato || undefined,
      codigo,
      validadeMinutos: OTP_VALIDADE_MINUTOS,
    });

    const envio = await sendEmail({
      to: email,
      subject: `Código para assinar contrato ${contrato.numero_contrato || ''}`.trim(),
      html,
    });

    if (!envio.success) {
      return createErrorResponse(envio.error || 'Não foi possível enviar o e-mail.', 502);
    }

    if (isResendMockEnabled()) {
      console.log('\n┌──────────────────────────────────────────────────');
      console.log('│ [MOCK] Código OTP assinatura (não enviado por e-mail):', codigo);
      console.log('└──────────────────────────────────────────────────\n');
    }

    return createApiResponse({
      mensagem: isResendMockEnabled()
        ? 'Modo desenvolvimento: código disponível abaixo (e-mail não enviado).'
        : 'Código enviado para o e-mail informado.',
      expiraEm: expiraEm,
      ...(isResendMockEnabled() ? { codigoOtpDesenvolvimento: codigo } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
