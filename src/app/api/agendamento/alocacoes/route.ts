import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createErrorResponse,
  getAuthenticatedUser,
  getRequestBody,
  handleApiError
} from '@/lib/api/route-helpers';
import { dataService } from '@/lib/data-service';
import { AgendamentoConflitoHorarioError } from '@/lib/repositories/supabase/agendamento-alocacao-supabase-repository';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const url = new URL(request.url);
    const eventoId = url.searchParams.get('eventoId');
    const validarConflito = url.searchParams.get('validarConflito') === 'true';

    if (validarConflito) {
      const profissionalId = url.searchParams.get('profissionalId');
      const inicio = url.searchParams.get('inicio');
      const fim = url.searchParams.get('fim');
      const ignorarAlocacaoId = url.searchParams.get('ignorarAlocacaoId') || undefined;

      if (!profissionalId || !inicio || !fim) {
        return createErrorResponse('profissionalId, inicio e fim são obrigatórios para validar conflito', 400);
      }

      const inicioDate = new Date(inicio);
      const fimDate = new Date(fim);
      if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(fimDate.getTime())) {
        return createErrorResponse('Datas inválidas para validação de conflito', 400);
      }

      const resultado = await dataService.validarConflitoAgendamento(
        user.id,
        profissionalId,
        inicioDate,
        fimDate,
        ignorarAlocacaoId
      );
      return createApiResponse(resultado);
    }

    if (!eventoId) {
      return createErrorResponse('eventoId é obrigatório', 400);
    }

    const alocacoes = await dataService.getAgendamentoAlocacoesPorEvento(user.id, eventoId);
    return createApiResponse(alocacoes);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);

    if (!body?.eventoId || !body?.profissionalId || !body?.inicioTs || !body?.fimTs) {
      return createErrorResponse('eventoId, profissionalId, inicioTs e fimTs são obrigatórios', 400);
    }

    const inicioTs = new Date(body.inicioTs);
    const fimTs = new Date(body.fimTs);

    if (Number.isNaN(inicioTs.getTime()) || Number.isNaN(fimTs.getTime())) {
      return createErrorResponse('inicioTs ou fimTs inválidos', 400);
    }

    const alocacao = await dataService.createAgendamentoAlocacao(user.id, {
      eventoId: `${body.eventoId}`,
      servicoEventoId: body.servicoEventoId ? `${body.servicoEventoId}` : undefined,
      profissionalId: `${body.profissionalId}`,
      inicioTs,
      fimTs,
      status: body.status || 'agendado',
      observacoes: body.observacoes ? `${body.observacoes}` : undefined
    });

    return createApiResponse(alocacao, 201);
  } catch (error) {
    if (error instanceof AgendamentoConflitoHorarioError) {
      return createErrorResponse(error.message, 409);
    }
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);

    if (!body?.id) {
      return createErrorResponse('id é obrigatório', 400);
    }

    const payload: Record<string, unknown> = {};
    if (body.status) payload.status = body.status;
    if (body.profissionalId) payload.profissionalId = body.profissionalId;
    if (body.observacoes !== undefined) payload.observacoes = body.observacoes;
    if (body.servicoEventoId !== undefined) payload.servicoEventoId = body.servicoEventoId;
    if (body.inicioTs) payload.inicioTs = new Date(body.inicioTs);
    if (body.fimTs) payload.fimTs = new Date(body.fimTs);

    if (Object.keys(payload).length === 1 && payload.status) {
      const atualizado = await dataService.updateAgendamentoAlocacaoStatus(
        user.id,
        body.id,
        body.status
      );
      return createApiResponse(atualizado);
    }

    const atualizado = await dataService.updateAgendamentoAlocacao(user.id, body.id, payload as any);

    return createApiResponse(atualizado);
  } catch (error) {
    if (error instanceof AgendamentoConflitoHorarioError) {
      return createErrorResponse(error.message, 409);
    }
    return handleApiError(error);
  }
}
