import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createErrorResponse,
  getAuthenticatedUser,
  getRequestBody,
  handleApiError
} from '@/lib/api/route-helpers';
import { dataService } from '@/lib/data-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const url = new URL(request.url);
    const incluirInativos = url.searchParams.get('incluirInativos') === 'true';

    const profissionais = incluirInativos
      ? await dataService.getAgendamentoProfissionais(user.id)
      : await dataService.getAgendamentoProfissionaisAtivos(user.id);

    return createApiResponse(profissionais);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);

    if (!body?.nome || !`${body.nome}`.trim()) {
      return createErrorResponse('Nome do profissional é obrigatório', 400);
    }

    const profissional = await dataService.createAgendamentoProfissional(user.id, {
      nome: `${body.nome}`.trim(),
      especialidade: body.especialidade ? `${body.especialidade}` : undefined,
      observacoes: body.observacoes ? `${body.observacoes}` : undefined,
      ativo: body.ativo ?? true
    });

    return createApiResponse(profissional, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);

    if (!body?.id) {
      return createErrorResponse('id do profissional é obrigatório', 400);
    }

    const atualizado = await dataService.updateAgendamentoProfissional(user.id, body.id, {
      nome: body.nome,
      especialidade: body.especialidade,
      observacoes: body.observacoes,
      ativo: body.ativo
    });

    return createApiResponse(atualizado);
  } catch (error) {
    return handleApiError(error);
  }
}
