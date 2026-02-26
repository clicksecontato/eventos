import { NextRequest } from 'next/server';
import { 
  requireAdmin,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody,
  getRouteParams
} from '@/lib/api/route-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Permitir acesso público para landing page
    const { id } = await getRouteParams(params);
    // Usar Admin diretamente para bypassar regras do Firestore
    const { AdminPlanoRepository } = await import('@/lib/repositories/admin-plano-repository');
    const { AdminFuncionalidadeRepository } = await import('@/lib/repositories/admin-funcionalidade-repository');
    const planoRepo = new AdminPlanoRepository();
    const funcionalidadeRepo = new AdminFuncionalidadeRepository();
    
    const plano = await planoRepo.findById(id);
    if (!plano) {
      return createErrorResponse('Plano não encontrado', 404);
    }

    const funcionalidadesDetalhes = [];
    for (const funcId of plano.funcionalidades) {
      const func = await funcionalidadeRepo.findById(funcId);
      if (func) {
        funcionalidadesDetalhes.push(func);
      }
    }

    const planoComFuncionalidades = {
      ...plano,
      funcionalidadesDetalhes
    };

    return createApiResponse({ plano: planoComFuncionalidades });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await getRouteParams(params);
    const data = await getRequestBody(request);
    const { AdminPlanoRepository } = await import('@/lib/repositories/admin-plano-repository');
    const planoRepo = new AdminPlanoRepository();
    
    const plano = await planoRepo.update(id, {
      ...data,
      dataAtualizacao: new Date()
    });

    return createApiResponse({ plano });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await getRouteParams(params);
    const { AdminPlanoRepository } = await import('@/lib/repositories/admin-plano-repository');
    const planoRepo = new AdminPlanoRepository();
    await planoRepo.delete(id);

    return createApiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

