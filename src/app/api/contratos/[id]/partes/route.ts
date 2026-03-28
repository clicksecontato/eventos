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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: contratoId } = await getRouteParams(params);

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(contratoId, user.id);
    if (!contrato) return createErrorResponse('Contrato não encontrado', 404);

    const parteRepo = repositoryFactory.getContratoParteRepository();
    const partes = await parteRepo.listarArvorePorContrato(contratoId, user.id);

    return createApiResponse({
      partes: partes.map((p) => ({
        ...p,
        dataCadastro: p.dataCadastro.toISOString(),
        dataAtualizacao: p.dataAtualizacao.toISOString(),
        signatarios: p.signatarios.map((s) => ({
          ...s,
          dataCadastro: s.dataCadastro.toISOString(),
          dataAtualizacao: s.dataAtualizacao.toISOString(),
        })),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: contratoId } = await getRouteParams(params);
    const body = await getRequestBody(request);
    const papelRaw = typeof body.papel === 'string' ? body.papel.trim().toLowerCase() : '';

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(contratoId, user.id);
    if (!contrato) return createErrorResponse('Contrato não encontrado', 404);

    if (!papelValido(papelRaw)) {
      return createErrorResponse(
        `Papel inválido. Use: ${PAPEIS.join(', ')}.`,
        400
      );
    }

    const ordem =
      body.ordemAssinatura !== undefined && body.ordemAssinatura !== null
        ? Number(body.ordemAssinatura)
        : null;
    if (ordem !== null && !Number.isFinite(ordem)) {
      return createErrorResponse('ordemAssinatura inválida.', 400);
    }

    const parteRepo = repositoryFactory.getContratoParteRepository();
    const parte = await parteRepo.criarParte({
      id: crypto.randomUUID(),
      contratoId,
      userId: user.id,
      papel: papelRaw,
      ordemAssinatura: ordem,
      obrigatoria: body.obrigatoria !== false,
    });

    await registrarEventoAuditoriaContrato({
      contratoId,
      userId: user.id,
      actorUserId: user.id,
      tipo: 'parte_criada',
      payload: { parteId: parte.id, papel: parte.papel, obrigatoria: parte.obrigatoria },
    });

    return createApiResponse(
      {
        ...parte,
        dataCadastro: parte.dataCadastro.toISOString(),
        dataAtualizacao: parte.dataAtualizacao.toISOString(),
        signatarios: [],
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
