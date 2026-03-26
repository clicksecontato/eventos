import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { s3Service } from '@/lib/s3-service';
import {
  bufferEhPngValido,
  calcularSha256Hex,
  incorporarAssinaturaNoPdf,
} from '@/lib/services/pdf-assinatura-service';
import { hashTokenAssinaturaCliente } from '@/lib/services/assinatura-cliente-link-service';
import type { AssinaturaAuditoriaContrato } from '@/types';
import { createApiResponse, createErrorResponse, getRouteParams, handleApiError } from '@/lib/api/route-helpers';

const LIMITE_BYTES_PNG = 500 * 1024;
const MIN_BYTES_ASSINATURA = 400;

function extrairPngDeBase64(imagemBase64: unknown): Buffer | null {
  if (typeof imagemBase64 !== 'string') return null;
  const trimmed = imagemBase64.trim();
  const match = trimmed.match(/^data:image\/png;base64,([\s\S]+)$/i);
  const b64 = match ? match[1].replace(/\s/g, '') : trimmed.replace(/\s/g, '');
  try {
    return Buffer.from(b64, 'base64');
  } catch {
    return null;
  }
}

function getClientIp(request: NextRequest): string | undefined {
  const encaminhado = request.headers.get('x-forwarded-for');
  if (encaminhado) return encaminhado.split(',')[0]?.trim();
  return request.headers.get('x-real-ip')?.trim() || undefined;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await getRouteParams(params);
    const tokenHash = hashTokenAssinaturaCliente(token);
    const supabase = getSupabaseClient(true) as any;

    const body = (await request.json().catch(() => ({}))) as {
      imagemBase64?: string;
      nomeSignatario?: string;
      emailSignatario?: string;
    };

    const pngBuffer = extrairPngDeBase64(body.imagemBase64);
    if (!pngBuffer || pngBuffer.length < MIN_BYTES_ASSINATURA) {
      return createErrorResponse('Imagem de assinatura inválida ou vazia.', 400);
    }
    if (pngBuffer.length > LIMITE_BYTES_PNG) {
      return createErrorResponse('Imagem de assinatura muito grande.', 400);
    }
    if (!bufferEhPngValido(pngBuffer)) {
      return createErrorResponse('Envie uma imagem PNG válida.', 400);
    }

    const { data: convite, error: conviteError } = await supabase
      .from('contratos_assinatura_convites')
      .select('*')
      .eq('token_hash', tokenHash)
      .limit(1)
      .maybeSingle();

    if (conviteError) return createErrorResponse(`Erro ao validar link: ${conviteError.message}`, 500);
    if (!convite) return createErrorResponse('Link de assinatura não encontrado.', 404);
    if (convite.status === 'assinado') return createErrorResponse('Este link já foi utilizado.', 409);
    if (new Date(convite.expira_em).getTime() < Date.now()) {
      await supabase.from('contratos_assinatura_convites').update({ status: 'expirado' }).eq('id', convite.id);
      return createErrorResponse('Este link expirou.', 410);
    }

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(convite.contrato_id, convite.user_id);
    if (!contrato) return createErrorResponse('Contrato não encontrado.', 404);
    if (contrato.status === 'assinado') return createErrorResponse('Contrato já assinado.', 409);
    if (!contrato.pdfPath) return createErrorResponse('Contrato sem PDF disponível.', 400);

    const pdfBuffer = await s3Service.downloadBuffer(contrato.pdfPath);
    const hashAntes = calcularSha256Hex(pdfBuffer);
    const nomeSignatario =
      body.nomeSignatario?.trim() || convite.nome_destinatario || 'Cliente';
    const emailSignatario = body.emailSignatario?.trim() || convite.email_destinatario || undefined;
    const ipCliente = getClientIp(request);
    const ua = request.headers.get('user-agent') || undefined;

    const pdfAssinado = await incorporarAssinaturaNoPdf({
      pdfBuffer,
      imagemPngBuffer: pngBuffer,
      nomeSignatario,
      emailSignatario,
      hashPdfAntesAssinatura: hashAntes,
      linhasAuditoria: [
        `Origem: link público de assinatura`,
        `Data e hora (servidor): ${new Date().toISOString()}`,
        ipCliente ? `IP: ${ipCliente}` : '',
        ua ? `User-Agent: ${ua.slice(0, 280)}` : '',
      ].filter(Boolean),
    });

    const hashDepois = calcularSha256Hex(pdfAssinado);
    const novoPath = `contratos/${contrato.userId}/${contrato.id}-assinado-cliente.pdf`;
    const upload = await s3Service.uploadBuffer(pdfAssinado, novoPath, 'application/pdf');
    if (!upload.success || !upload.url) {
      return createErrorResponse(upload.error || 'Erro ao enviar PDF assinado.', 500);
    }

    const auditoria: AssinaturaAuditoriaContrato = {
      hashPdfAntesAssinatura: hashAntes,
      hashPdfDepoisAssinatura: hashDepois,
      assinadoEm: new Date().toISOString(),
      signatarioUserId: convite.user_id,
      signatarioNome: nomeSignatario,
      signatarioEmail: emailSignatario,
      ip: ipCliente,
      userAgent: ua,
    };

    const atualizado = await contratoRepo.update(contrato.id, {
      userId: contrato.userId,
      pdfPathOriginal: contrato.pdfPathOriginal || contrato.pdfPath,
      pdfPath: novoPath,
      pdfUrl: upload.url,
      status: 'assinado',
      dataAssinatura: new Date(),
      assinadoPor: convite.user_id,
      assinaturaAuditoria: auditoria,
    });

    await supabase
      .from('contratos_assinatura_convites')
      .update({
        status: 'assinado',
        assinado_em: new Date().toISOString(),
        ip_assinatura: ipCliente || null,
        user_agent_assinatura: ua || null,
        nome_signatario: nomeSignatario,
        email_signatario: emailSignatario || null,
      })
      .eq('id', convite.id);

    return createApiResponse({
      contratoId: atualizado.id,
      pdfUrl: atualizado.pdfUrl,
      status: atualizado.status,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

