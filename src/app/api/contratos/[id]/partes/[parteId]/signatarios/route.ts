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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; parteId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: contratoId, parteId } = await getRouteParams(params);
    const body = await getRequestBody(request);

    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const documento = typeof body.documento === 'string' ? body.documento.trim() : undefined;

    if (nome.length < 2) {
      return createErrorResponse('Informe o nome do signatário (mínimo 2 caracteres).', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return createErrorResponse('Informe um e-mail válido.', 400);
    }

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(contratoId, user.id);
    if (!contrato) return createErrorResponse('Contrato não encontrado', 404);

    const parteRepo = repositoryFactory.getContratoParteRepository();
    await parteRepo.assertParteDoContrato(parteId, contratoId, user.id);

    const signatario = await parteRepo.criarSignatario({
      id: crypto.randomUUID(),
      parteId,
      contratoId,
      userId: user.id,
      nome,
      email,
      documento: documento || null,
    });

    await registrarEventoAuditoriaContrato({
      contratoId,
      userId: user.id,
      actorUserId: user.id,
      tipo: 'signatario_criado',
      payload: { signatarioId: signatario.id, parteId, nome: signatario.nome, email: signatario.email },
    });

    return createApiResponse(
      {
        ...signatario,
        dataCadastro: signatario.dataCadastro.toISOString(),
        dataAtualizacao: signatario.dataAtualizacao.toISOString(),
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
