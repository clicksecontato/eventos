import { NextRequest } from 'next/server';
import { PreCadastroEventoService } from '@/lib/services/pre-cadastro-evento-service';
import { StatusPreCadastro } from '@/types';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRouteParams,
  getRequestBody
} from '@/lib/api/route-helpers';
import { parseLocalDate } from '@/lib/utils/date-helpers';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

type DadosPreCadastro = Partial<Record<string, unknown>> & {
  dataEvento?: Date;
};

/**
 * GET /api/pre-cadastros/[id]
 * Busca pré-cadastro por ID (público, mas valida expiração)
 * Não requer autenticação
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await getRouteParams(params);
    
    const preCadastro = await PreCadastroEventoService.buscarPorIdPublic(id);
    
    if (!preCadastro) {
      return createErrorResponse('Pré-cadastro não encontrado', 404);
    }
    
    // Se expirado, retornar erro específico
    if (preCadastro.status === StatusPreCadastro.EXPIRADO) {
      return createErrorResponse(
        'Este link de pré-cadastro expirou. Por favor, entre em contato com o dono da conta.',
        410 // Gone
      );
    }
    
    return createApiResponse(preCadastro);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/pre-cadastros/[id]
 * Salva dados do pré-cadastro preenchidos pelo cliente (público)
 * Não requer autenticação
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await getRouteParams(params);
    const body = await getRequestBody(request);
    
    const { dados, servicosIds } = body as {
      dados: DadosPreCadastro;
      servicosIds?: string[];
    };
    
    if (!dados) {
      return createErrorResponse('Dados do formulário são obrigatórios', 400);
    }
    
    // Validar campos obrigatórios
    const camposObrigatorios = {
      cliente: ['clienteNome', 'clienteEmail', 'clienteTelefone'],
      evento: ['dataEvento', 'tipoEventoId']
    };
    
    const camposFaltando: string[] = [];
    
    // Validar dados do cliente
    for (const campo of camposObrigatorios.cliente) {
      const valor = dados[campo];
      if (!valor || (typeof valor === 'string' && valor.trim() === '')) {
        camposFaltando.push(campo);
      }
    }
    
    // Validar dados do evento
    for (const campo of camposObrigatorios.evento) {
      const valor = dados[campo];
      if (!valor || (typeof valor === 'string' && valor.trim() === '')) {
        camposFaltando.push(campo);
      }
    }
    
    if (camposFaltando.length > 0) {
      return createErrorResponse(
        `Os seguintes campos são obrigatórios: ${camposFaltando.join(', ')}`,
        400
      );
    }
    
    // Converter dataEvento de string para Date se necessário
    // Usar parseLocalDate para evitar problemas de timezone
    const dataEventoRaw = dados.dataEvento;
    if (typeof dataEventoRaw === 'string') {
      dados.dataEvento = parseLocalDate(dataEventoRaw);
    }
    
    // Salvar pré-cadastro
    const preCadastroAtualizado = await PreCadastroEventoService.salvarPreCadastro(
      id,
      dados,
      servicosIds
    );
    
    return createApiResponse({
      success: true,
      message: 'Pré-cadastro realizado com sucesso!',
      preCadastro: preCadastroAtualizado
    });
  } catch (error: unknown) {
    // Verificar se é erro de validação (expiração, já preenchido, etc.)
    const message = getErrorMessage(error);
    if (message.includes('expirado') || message.includes('já foi preenchido')) {
      return createErrorResponse(message, 400);
    }
    
    return handleApiError(error);
  }
}

/**
 * DELETE /api/pre-cadastros/[id]
 * Deleta pré-cadastro e seus serviços
 * Autenticado
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    
    await PreCadastroEventoService.deletar(id, user.id);
    
    return createApiResponse({
      success: true,
      message: 'Pré-cadastro deletado com sucesso'
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes('não encontrado') || message.includes('já foi convertido')) {
      return createErrorResponse(message, 400);
    }
    
    return handleApiError(error);
  }
}
