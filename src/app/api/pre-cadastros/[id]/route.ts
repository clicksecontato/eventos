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
      dados: Partial<any>;
      servicosIds?: string[];
    };
    
    if (!dados) {
      return createErrorResponse('Dados do formulário são obrigatórios', 400);
    }
    
    // Validar campos obrigatórios
    const camposObrigatorios = {
      cliente: ['clienteNome', 'clienteEmail', 'clienteTelefone'],
      evento: ['dataEvento', 'local', 'endereco', 'contratante', 'numeroConvidados']
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
      // Validação especial para numeroConvidados
      if (campo === 'numeroConvidados' && (!valor || Number(valor) <= 0)) {
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
    if (dados.dataEvento && typeof dados.dataEvento === 'string') {
      dados.dataEvento = parseLocalDate(dados.dataEvento);
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
  } catch (error: any) {
    // Verificar se é erro de validação (expiração, já preenchido, etc.)
    if (error.message?.includes('expirado') || error.message?.includes('já foi preenchido')) {
      return createErrorResponse(error.message, 400);
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
  } catch (error: any) {
    if (error.message?.includes('não encontrado') || error.message?.includes('já foi convertido')) {
      return createErrorResponse(error.message, 400);
    }
    
    return handleApiError(error);
  }
}
