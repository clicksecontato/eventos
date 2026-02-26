import { NextRequest } from 'next/server';
import { dataService } from '@/lib/data-service';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRouteParams
} from '@/lib/api/route-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    const evento = await dataService.getEventoById(id, user.id);
    
    if (!evento) {
      return createErrorResponse('Evento não encontrado', 404);
    }

    return createApiResponse(evento);
  } catch (error) {
    return handleApiError(error);
  }
}

