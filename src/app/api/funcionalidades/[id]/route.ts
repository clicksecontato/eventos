import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
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
    await requireAdmin();

    const { id } = await getRouteParams(params);
    const repo = repositoryFactory.getFuncionalidadeRepository();
    const funcionalidade = await repo.findById(id);

    if (!funcionalidade) {
      return createErrorResponse('Funcionalidade não encontrada', 404);
    }

    return createApiResponse({ funcionalidade });
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
    const repo = repositoryFactory.getFuncionalidadeRepository();
    
    const funcionalidade = await repo.update(id, data);

    return createApiResponse({ funcionalidade });
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
    const repo = repositoryFactory.getFuncionalidadeRepository();
    await repo.delete(id);

    return createApiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

