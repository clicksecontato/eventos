import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import {
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody,
  getRouteParams,
} from '@/lib/api/route-helpers';
import { registrarEventoAuditoriaContrato } from '@/lib/services/contrato-auditoria-service';
import type { StatusContratoParteSignatario } from '@/types';

const STATUS: StatusContratoParteSignatario[] = [
  'pendente',
  'convite_enviado',
  'assinado',
  'recusado',
  'expirado',
];

function statusValido(s: string): s is StatusContratoParteSignatario {
  return STATUS.includes(s as StatusContratoParteSignatario);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signatarioId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: contratoId, signatarioId } = await getRouteParams(params);
    const body = await getRequestBody(request);

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(contratoId, user.id);
    if (!contrato) return createErrorResponse('Contrato não encontrado', 404);

    const parteRepo = repositoryFactory.getContratoParteRepository();
    const existente = await parteRepo.buscarSignatario(signatarioId, user.id);
    if (!existente || existente.contratoId !== contratoId) {
      return createErrorResponse('Signatário não encontrado neste contrato.', 404);
    }

    const patch: {
      nome?: string;
      email?: string;
      documento?: string | null;
      status?: StatusContratoParteSignatario;
    } = {};

    if (body.nome !== undefined) {
      const n = String(body.nome).trim();
      if (n.length < 2) return createErrorResponse('Nome inválido.', 400);
      patch.nome = n;
    }
    if (body.email !== undefined) {
      const e = String(body.email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return createErrorResponse('E-mail inválido.', 400);
      }
      patch.email = e;
    }
    if (body.documento !== undefined) {
      patch.documento = body.documento === null || body.documento === '' ? null : String(body.documento);
    }
    if (body.status !== undefined) {
      const st = String(body.status).trim();
      if (!statusValido(st)) return createErrorResponse('Status inválido.', 400);
      patch.status = st;
    }

    if (Object.keys(patch).length === 0) {
      return createErrorResponse('Nenhum campo para atualizar.', 400);
    }

    const atualizado = await parteRepo.atualizarSignatario(signatarioId, user.id, patch);

    await registrarEventoAuditoriaContrato({
      contratoId,
      userId: user.id,
      actorUserId: user.id,
      tipo: 'signatario_atualizado',
      payload: { signatarioId, ...patch },
    });

    return createApiResponse({
      ...atualizado,
      dataCadastro: atualizado.dataCadastro.toISOString(),
      dataAtualizacao: atualizado.dataAtualizacao.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; signatarioId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: contratoId, signatarioId } = await getRouteParams(params);

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(contratoId, user.id);
    if (!contrato) return createErrorResponse('Contrato não encontrado', 404);

    const parteRepo = repositoryFactory.getContratoParteRepository();
    const existente = await parteRepo.buscarSignatario(signatarioId, user.id);
    if (!existente || existente.contratoId !== contratoId) {
      return createErrorResponse('Signatário não encontrado neste contrato.', 404);
    }

    await parteRepo.excluirSignatario(signatarioId, user.id);

    await registrarEventoAuditoriaContrato({
      contratoId,
      userId: user.id,
      actorUserId: user.id,
      tipo: 'signatario_excluido',
      payload: { signatarioId },
    });

    return createApiResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
