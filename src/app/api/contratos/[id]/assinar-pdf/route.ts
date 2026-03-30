import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import {
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRouteParams,
} from '@/lib/api/route-helpers';
import { s3Service } from '@/lib/s3-service';
import {
  bufferEhPngValido,
  calcularSha256Hex,
  incorporarAssinaturaNoPdf,
} from '@/lib/services/pdf-assinatura-service';
import type { AssinaturaAuditoriaContrato } from '@/types';
import { registrarEventoAuditoriaContrato } from '@/lib/services/contrato-auditoria-service';

export const maxDuration = 60;

const LIMITE_BYTES_PNG = 500 * 1024;
const MIN_BYTES_ASSINATURA = 400;

function extrairPngDeBase64(imagemBase64: unknown): Buffer | null {
  if (typeof imagemBase64 !== 'string') {
    return null;
  }
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
  if (encaminhado) {
    return encaminhado.split(',')[0]?.trim();
  }
  const realIp = request.headers.get('x-real-ip');
  return realIp?.trim() || undefined;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Corpo JSON inválido', 400);
    }

    const imagemBase64 =
      body && typeof body === 'object' && 'imagemBase64' in body
        ? (body as { imagemBase64: unknown }).imagemBase64
        : null;

    const pngBuffer = extrairPngDeBase64(imagemBase64);
    if (!pngBuffer || pngBuffer.length < MIN_BYTES_ASSINATURA) {
      return createErrorResponse(
        'Imagem de assinatura inválida ou vazia. Desenhe sua assinatura no quadro.',
        400
      );
    }
    if (pngBuffer.length > LIMITE_BYTES_PNG) {
      return createErrorResponse('Imagem de assinatura muito grande.', 400);
    }
    if (!bufferEhPngValido(pngBuffer)) {
      return createErrorResponse('Envie uma imagem PNG (data URL image/png).', 400);
    }

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(id, user.id);

    if (!contrato) {
      return createErrorResponse('Contrato não encontrado', 404);
    }

    if (contrato.status === 'assinado' || contrato.status === 'document_closed') {
      return createErrorResponse('Este contrato já foi assinado.', 409);
    }

    if (contrato.status !== 'gerado') {
      return createErrorResponse(
        'Gere o PDF do contrato antes de assinar (status deve ser "gerado").',
        400
      );
    }

    if (!contrato.pdfPath?.trim()) {
      return createErrorResponse('Contrato sem PDF no armazenamento. Gere o PDF novamente.', 400);
    }

    const pdfBuffer = await s3Service.downloadBuffer(contrato.pdfPath);
    if (!pdfBuffer.length) {
      return createErrorResponse('Não foi possível baixar o PDF para assinatura.', 500);
    }

    const hashAntes = calcularSha256Hex(pdfBuffer);
    const ipCliente = getClientIp(request);
    const ua = request.headers.get('user-agent');

    const nomeSignatario =
      user.name?.trim() ||
      user.email?.trim() ||
      `Usuário ${user.id.slice(0, 8)}`;

    const linhasAuditoria = [
      `Data e hora (servidor): ${new Date().toISOString()}`,
      user.email ? `Conta: ${user.email}` : undefined,
      ipCliente ? `IP: ${ipCliente}` : undefined,
      ua ? `User-Agent: ${ua.slice(0, 280)}` : undefined,
    ].filter(Boolean) as string[];

    let pdfAssinado: Buffer;
    try {
      pdfAssinado = await incorporarAssinaturaNoPdf({
        pdfBuffer,
        imagemPngBuffer: pngBuffer,
        nomeSignatario,
        emailSignatario: user.email || undefined,
        hashPdfAntesAssinatura: hashAntes,
        linhasAuditoria,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao processar PDF';
      console.error('[assinar-pdf] incorporarAssinaturaNoPdf:', e);
      return createErrorResponse(`Falha ao incorporar assinatura: ${msg}`, 500);
    }

    const hashDepois = calcularSha256Hex(pdfAssinado);

    const novoPath = `contratos/${contrato.userId}/${contrato.id}-assinado.pdf`;

    const upload = await s3Service.uploadBuffer(pdfAssinado, novoPath, 'application/pdf');
    if (!upload.success || !upload.url) {
      return createErrorResponse(upload.error || 'Erro ao enviar PDF assinado', 500);
    }

    const auditoria: AssinaturaAuditoriaContrato = {
      hashPdfAntesAssinatura: hashAntes,
      hashPdfDepoisAssinatura: hashDepois,
      assinadoEm: new Date().toISOString(),
      signatarioUserId: user.id,
      signatarioEmail: user.email || undefined,
      signatarioNome: user.name || undefined,
      ip: ipCliente,
      userAgent: ua || undefined,
    };

    const atualizado = await contratoRepo.update(id, {
      userId: user.id,
      pdfPathOriginal: contrato.pdfPathOriginal || contrato.pdfPath,
      pdfPath: novoPath,
      pdfUrl: upload.url,
      status: 'document_closed',
      dataAssinatura: new Date(),
      assinadoPor: user.id,
      assinaturaAuditoria: auditoria,
    });

    await registrarEventoAuditoriaContrato({
      contratoId: id,
      userId: user.id,
      actorUserId: user.id,
      tipo: 'assinado_interno',
      payload: {
        signatarioUserId: user.id,
        signatarioEmail: user.email ?? null,
        hashPdfAntesAssinatura: hashAntes,
        hashPdfDepoisAssinatura: hashDepois,
      },
    });

    return createApiResponse(atualizado);
  } catch (error) {
    return handleApiError(error);
  }
}
