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
import type { PapelContratoParte } from '@/types';

const PAPEIS: PapelContratoParte[] = [
  'cliente',
  'contratante',
  'contratada',
  'testemunha',
  'representante',
  'outro',
];

function papelValido(p: string): p is PapelContratoParte {
  return PAPEIS.includes(p as PapelContratoParte);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; parteId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: contratoId, parteId } = await getRouteParams(params);
    const body = await getRequestBody(request);

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(contratoId, user.id);
    if (!contrato) return createErrorResponse('Contrato não encontrado', 404);

    const parteRepo = repositoryFactory.getContratoParteRepository();
    await parteRepo.assertParteDoContrato(parteId, contratoId, user.id);

    const patch: { papel?: string; ordemAssinatura?: number | null; obrigatoria?: boolean } = {};
    if (body.papel !== undefined) {
      const papelRaw = String(body.papel).trim().toLowerCase();
      if (!papelValido(papelRaw)) {
        return createErrorResponse('Papel inválido.', 400);
      }
      patch.papel = papelRaw;
    }
    if (body.ordemAssinatura !== undefined) {
      if (body.ordemAssinatura === null) {
        patch.ordemAssinatura = null;
      } else {
        const n = Number(body.ordemAssinatura);
        if (!Number.isFinite(n)) return createErrorResponse('ordemAssinatura inválida.', 400);
        patch.ordemAssinatura = n;
      }
    }
    if (body.obrigatoria !== undefined) {
      patch.obrigatoria = Boolean(body.obrigatoria);
    }

    if (Object.keys(patch).length === 0) {
      return createErrorResponse('Nenhum campo para atualizar.', 400);
    }

    const atualizada = await parteRepo.atualizarParte(parteId, user.id, patch);

    await registrarEventoAuditoriaContrato({
      contratoId,
      userId: user.id,
      actorUserId: user.id,
      tipo: 'parte_atualizada',
      payload: { parteId, ...patch },
    });

    return createApiResponse({
      ...atualizada,
      dataCadastro: atualizada.dataCadastro.toISOString(),
      dataAtualizacao: atualizada.dataAtualizacao.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; parteId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: contratoId, parteId } = await getRouteParams(params);

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(contratoId, user.id);
    if (!contrato) return createErrorResponse('Contrato não encontrado', 404);

    const parteRepo = repositoryFactory.getContratoParteRepository();
    await parteRepo.assertParteDoContrato(parteId, contratoId, user.id);
    await parteRepo.excluirParte(parteId, user.id);

    await registrarEventoAuditoriaContrato({
      contratoId,
      userId: user.id,
      actorUserId: user.id,
      tipo: 'parte_excluida',
      payload: { parteId },
    });

    return createApiResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
