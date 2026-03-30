import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { s3Service } from '@/lib/s3-service';
import {
  bufferEhPngValido,
  calcularSha256Hex,
  incorporarAssinaturaNoPdf,
} from '@/lib/services/pdf-assinatura-service';
import {
  calcularHashReferenciaContratoParaConvite,
  emailsCoincidem,
  hashTokenAssinaturaCliente,
} from '@/lib/services/assinatura-cliente-link-service';
import type { AssinaturaAuditoriaContrato, Contrato as ContratoTipo } from '@/types';
import { createApiResponse, createErrorResponse, getRouteParams, handleApiError } from '@/lib/api/route-helpers';
import { registrarEventoAuditoriaContrato } from '@/lib/services/contrato-auditoria-service';

const LIMITE_BYTES_PNG = 500 * 1024;
const MIN_BYTES_ASSINATURA = 400;
const MIN_NOME = 2;

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
      cienciaDeclarada?: boolean;
    };

    if (body.cienciaDeclarada !== true) {
      return createErrorResponse('É necessário declarar ciência e concordância com o documento.', 400);
    }

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
    if (convite.status === 'cancelado') return createErrorResponse('Este link foi cancelado.', 410);
    if (convite.status === 'assinado') return createErrorResponse('Este link já foi utilizado.', 409);
    if (new Date(convite.expira_em).getTime() < Date.now()) {
      await supabase.from('contratos_assinatura_convites').update({ status: 'expirado' }).eq('id', convite.id);
      return createErrorResponse('Este link expirou.', 410);
    }

    const emailDest = convite.email_destinatario?.trim();
    if (emailDest && !convite.otp_verificado_em) {
      return createErrorResponse('Confirme o código enviado ao e-mail antes de assinar.', 403);
    }

    const nomeSignatario = body.nomeSignatario?.trim() || '';
    const emailSignatario = body.emailSignatario?.trim() || '';

    if (nomeSignatario.length < MIN_NOME) {
      return createErrorResponse('Informe seu nome completo.', 400);
    }

    if (!emailSignatario || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSignatario)) {
      return createErrorResponse('Informe um e-mail válido.', 400);
    }

    if (emailDest && !emailsCoincidem(emailSignatario, emailDest)) {
      return createErrorResponse('O e-mail deve ser o mesmo indicado no convite.', 400);
    }

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(convite.contrato_id, convite.user_id);
    if (!contrato) return createErrorResponse('Contrato não encontrado.', 404);

    const hashAtual = calcularHashReferenciaContratoParaConvite({
      id: contrato.id,
      pdfPath: contrato.pdfPath,
      dataAtualizacao: contrato.dataAtualizacao,
    });

    if (convite.contrato_ref_hash && hashAtual !== convite.contrato_ref_hash) {
      return createErrorResponse(
        'O contrato foi alterado após o envio deste link. Solicite um novo convite.',
        409
      );
    }

    const parteRepo = repositoryFactory.getContratoParteRepository();
    if (convite.signatario_id) {
      const signatario = await parteRepo.buscarSignatario(String(convite.signatario_id), convite.user_id);
      if (!signatario || signatario.contratoId !== contrato.id) {
        return createErrorResponse('Signatário inválido para este convite.', 400);
      }
      if (signatario.status === 'assinado') {
        return createErrorResponse('Este signatário já concluiu a assinatura.', 409);
      }
    } else if (contrato.status === 'assinado' || contrato.status === 'document_closed') {
      return createErrorResponse(
        'Contrato já assinado. Gere um novo link vinculado a um signatário cadastrado para assinaturas adicionais.',
        409
      );
    }

    if (!contrato.pdfPath) return createErrorResponse('Contrato sem PDF disponível.', 400);

    const pdfBuffer = await s3Service.downloadBuffer(contrato.pdfPath);
    const hashAntes = calcularSha256Hex(pdfBuffer);
    const ipCliente = getClientIp(request);
    const ua = request.headers.get('user-agent') || undefined;

    const pdfAssinado = await incorporarAssinaturaNoPdf({
      pdfBuffer,
      imagemPngBuffer: pngBuffer,
      nomeSignatario,
      emailSignatario,
      hashPdfAntesAssinatura: hashAntes,
      linhasAuditoria: [
        `Origem: link público de assinatura (convite ${convite.id})`,
        `Modalidade: assinatura eletrônica avançada (não ICP-Brasil)`,
        `Data e hora (servidor): ${new Date().toISOString()}`,
        convite.otp_verificado_em ? `E-mail confirmado (OTP) em: ${convite.otp_verificado_em}` : '',
        convite.contrato_ref_hash ? `Referência do documento (hash): ${convite.contrato_ref_hash.slice(0, 16)}…` : '',
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
      conviteAssinaturaId: convite.id,
      modalidadeEletronica: 'link_publico',
      cienciaDeclarada: true,
      referenciaDocumentoHash: convite.contrato_ref_hash || undefined,
      otpVerificadoEm: convite.otp_verificado_em || undefined,
      ...(contrato.assinaturaAuditoria
        ? { anterior: contrato.assinaturaAuditoria }
        : {}),
    };

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

    if (convite.signatario_id) {
      try {
        await parteRepo.atualizarSignatario(String(convite.signatario_id), convite.user_id, {
          status: 'assinado',
        });
      } catch (e) {
        console.warn('[assinatura-link] atualizar status do signatário:', e);
      }
    }

    let statusFinalContrato: ContratoTipo['status'] = 'assinado';
    if (convite.signatario_id) {
      try {
        const arvore = await parteRepo.listarArvorePorContrato(contrato.id, convite.user_id);
        const signatarios = arvore.flatMap((p) => p.signatarios);
        const todosAssinaram = signatarios.length > 0 && signatarios.every((s) => s.status === 'assinado');
        if (todosAssinaram) {
          statusFinalContrato = 'document_closed';
        }
      } catch (e) {
        console.warn('[assinatura-link] verificar fechamento do documento:', e);
      }
    } else {
      // Fluxo legado sem partes/signatários vinculados: a assinatura encerra o documento.
      statusFinalContrato = 'document_closed';
    }

    const atualizado = await contratoRepo.update(contrato.id, {
      userId: contrato.userId,
      pdfPathOriginal: contrato.pdfPathOriginal || contrato.pdfPath,
      pdfPath: novoPath,
      pdfUrl: upload.url,
      status: statusFinalContrato,
      dataAssinatura: new Date(),
      assinadoPor: convite.user_id,
      assinaturaAuditoria: auditoria,
    });

    await registrarEventoAuditoriaContrato({
      contratoId: contrato.id,
      userId: convite.user_id,
      actorUserId: null,
      tipo: 'assinado_link_publico',
      payload: {
        conviteId: convite.id,
        nomeSignatario,
        emailSignatario,
        hashPdfAntesAssinatura: hashAntes,
        hashPdfDepoisAssinatura: hashDepois,
        ip: ipCliente ?? null,
      },
    });

    return createApiResponse({
      contratoId: atualizado.id,
      pdfUrl: atualizado.pdfUrl,
      status: atualizado.status,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
