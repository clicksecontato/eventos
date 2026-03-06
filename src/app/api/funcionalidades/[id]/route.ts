import { NextRequest } from 'next/server';
import { 
  requireAdminOrPremium,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody,
  getRouteParams
} from '@/lib/api/route-helpers';
import { createRepositoriosAdminBasicos } from '@/lib/composition/server-assinatura-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrPremium();

    const { id } = await getRouteParams(params);
    const { funcionalidadeRepo: repo } = await createRepositoriosAdminBasicos();
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
    await requireAdminOrPremium();

    const { id } = await getRouteParams(params);
    const data = await getRequestBody(request);
    const { funcionalidadeRepo: repo } = await createRepositoriosAdminBasicos();
    
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
    await requireAdminOrPremium();

    const { id } = await getRouteParams(params);
    const { funcionalidadeRepo: repo } = await createRepositoriosAdminBasicos();
    await repo.delete(id);

    return createApiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

