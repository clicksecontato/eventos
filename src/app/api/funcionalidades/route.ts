import { NextRequest } from 'next/server';
import { 
  requireAdminOrPremium,
  handleApiError,
  createApiResponse,
  getRequestBody
} from '@/lib/api/route-helpers';
import { createRepositoriosAdminBasicos } from '@/lib/composition/server-assinatura-context';

export async function GET() {
  try {
    await requireAdminOrPremium();

    const { funcionalidadeRepo: repo } = await createRepositoriosAdminBasicos();
    let funcionalidades: unknown[] = [];
    
    try {
      funcionalidades = await repo.findAllOrdered();
    } catch {
      // Tentar buscar sem ordenação
      try {
        funcionalidades = await repo.findAll();
      } catch (fallbackError: unknown) {
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
    await requireAdminOrPremium();

    const data = await getRequestBody(request);
    const { funcionalidadeRepo: repo } = await createRepositoriosAdminBasicos();
    
    const funcionalidade = await repo.create({
      ...data,
      dataCadastro: new Date()
    });

    return createApiResponse({ funcionalidade }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

