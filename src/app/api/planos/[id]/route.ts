import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  requireAdminOrPremium,
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
    const planoRepo = repositoryFactory.getAdminPlanoRepository();
    const funcionalidadeRepo = repositoryFactory.getAdminFuncionalidadeRepository();
    
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
    await requireAdminOrPremium();

    const { id } = await getRouteParams(params);
    const data = await getRequestBody(request);
    const planoRepo = repositoryFactory.getAdminPlanoRepository();
    
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
    await requireAdminOrPremium();

    const { id } = await getRouteParams(params);
    const planoRepo = repositoryFactory.getAdminPlanoRepository();
    await planoRepo.delete(id);

    return createApiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

