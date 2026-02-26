import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  requireAdmin,
  handleApiError,
  createApiResponse,
  getRequestBody
} from '@/lib/api/route-helpers';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const repo = repositoryFactory.getFuncionalidadeRepository();
    let funcionalidades: any[] = [];
    
    try {
      funcionalidades = await repo.findAllOrdered();
    } catch (error: any) {
      // Tentar buscar sem ordenação
      try {
        funcionalidades = await repo.findAll();
      } catch (fallbackError: any) {
        throw fallbackError;
      }
    }

    return createApiResponse({ 
      funcionalidades,
      count: funcionalidades.length 
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const data = await getRequestBody(request);
    const repo = repositoryFactory.getFuncionalidadeRepository();
    
    const funcionalidade = await repo.create({
      ...data,
      dataCadastro: new Date()
    });

    return createApiResponse({ funcionalidade }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

