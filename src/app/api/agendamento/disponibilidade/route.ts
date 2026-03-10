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
    const profissionalId = url.searchParams.get('profissionalId');
    const inicio = url.searchParams.get('inicio');
    const fim = url.searchParams.get('fim');

    if (!profissionalId || !inicio || !fim) {
      return createErrorResponse('profissionalId, inicio e fim são obrigatórios', 400);
    }

    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);

    if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(fimDate.getTime())) {
      return createErrorResponse('Parâmetros de data inválidos', 400);
    }

    const disponibilidade = await dataService.getDisponibilidadeAgendamentoProfissional(
      user.id,
      profissionalId,
      inicioDate,
      fimDate
    );

    return createApiResponse(disponibilidade);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);

    const tipo = body?.tipo;

    if (tipo === 'disponibilidade') {
      if (!body.profissionalId) {
        return createErrorResponse('profissionalId é obrigatório', 400);
      }
      if (body.diaSemana === undefined || !body.horaInicio || !body.horaFim) {
        return createErrorResponse('diaSemana, horaInicio e horaFim são obrigatórios', 400);
      }

      const criada = await dataService.createAgendamentoDisponibilidade(user.id, {
        profissionalId: body.profissionalId,
        diaSemana: Number(body.diaSemana),
        horaInicio: `${body.horaInicio}`,
        horaFim: `${body.horaFim}`,
        ativo: body.ativo ?? true
      });
      return createApiResponse(criada, 201);
    }

    if (tipo === 'bloqueio') {
      if (!body.profissionalId || !body.inicioTs || !body.fimTs) {
        return createErrorResponse('profissionalId, inicioTs e fimTs são obrigatórios', 400);
      }

      const inicioTs = new Date(body.inicioTs);
      const fimTs = new Date(body.fimTs);
      if (Number.isNaN(inicioTs.getTime()) || Number.isNaN(fimTs.getTime())) {
        return createErrorResponse('inicioTs ou fimTs inválidos', 400);
      }

      const bloqueio = await dataService.createAgendamentoBloqueio(user.id, {
        profissionalId: body.profissionalId,
        inicioTs,
        fimTs,
        motivo: body.motivo ? `${body.motivo}` : undefined
      });

      return createApiResponse(bloqueio, 201);
    }

    return createErrorResponse('tipo inválido. Use "disponibilidade" ou "bloqueio"', 400);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);
    const tipo = body?.tipo;
    const id = body?.id;

    if (!id) {
      return createErrorResponse('id é obrigatório', 400);
    }

    if (tipo === 'disponibilidade') {
      const atualizada = await dataService.updateAgendamentoDisponibilidade(user.id, id, {
        diaSemana: body.diaSemana !== undefined ? Number(body.diaSemana) : undefined,
        horaInicio: body.horaInicio,
        horaFim: body.horaFim,
        ativo: body.ativo
      });
      return createApiResponse(atualizada);
    }

    if (tipo === 'bloqueio') {
      const inicioTs = body.inicioTs ? new Date(body.inicioTs) : undefined;
      const fimTs = body.fimTs ? new Date(body.fimTs) : undefined;
      if ((inicioTs && Number.isNaN(inicioTs.getTime())) || (fimTs && Number.isNaN(fimTs.getTime()))) {
        return createErrorResponse('inicioTs ou fimTs inválidos', 400);
      }

      const atualizado = await dataService.updateAgendamentoBloqueio(user.id, id, {
        inicioTs,
        fimTs,
        motivo: body.motivo
      });
      return createApiResponse(atualizado);
    }

    return createErrorResponse('tipo inválido. Use "disponibilidade" ou "bloqueio"', 400);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const url = new URL(request.url);
    const tipo = url.searchParams.get('tipo');
    const id = url.searchParams.get('id');

    if (!id) {
      return createErrorResponse('id é obrigatório', 400);
    }

    if (tipo === 'disponibilidade') {
      await dataService.deleteAgendamentoDisponibilidade(user.id, id);
      return createApiResponse({ sucesso: true });
    }

    if (tipo === 'bloqueio') {
      await dataService.deleteAgendamentoBloqueio(user.id, id);
      return createApiResponse({ sucesso: true });
    }

    return createErrorResponse('tipo inválido. Use "disponibilidade" ou "bloqueio"', 400);
  } catch (error) {
    return handleApiError(error);
  }
}
