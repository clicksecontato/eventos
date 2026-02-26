import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';

/**
 * POST - Preview de contrato
 * 
 * Body:
 * - modeloContratoId?: string - ID do modelo (opcional se template fornecido)
 * - template?: string - Template direto (opcional se modeloContratoId fornecido)
 * - dadosPreenchidos?: Record<string, any> - Dados manuais (opcional se eventoId fornecido)
 * - eventoId?: string - ID do evento para preencher variáveis automaticamente
 * 
 * Se eventoId fornecido, as variáveis do evento serão mescladas com dadosPreenchidos
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);
    const { modeloContratoId, template: templateDireto, dadosPreenchidos = {}, eventoId } = body;

    let template: string;
    let dados: Record<string, any> = { ...dadosPreenchidos };

    // Obter template
    if (templateDireto) {
      template = templateDireto;
    } else if (modeloContratoId) {
      const modeloRepo = repositoryFactory.getModeloContratoRepository();
      const modelo = await modeloRepo.findById(modeloContratoId);
      if (!modelo) {
        return createErrorResponse('Modelo não encontrado', 404);
      }
      template = modelo.template;
    } else {
      return createErrorResponse('modeloContratoId ou template é obrigatório', 400);
    }

    // Se eventoId fornecido, obter variáveis do evento (sempre buscar dados mais recentes)
    if (eventoId) {
      const { ContratoService } = await import('@/lib/services/contrato-service');
      const variaveisEvento = await ContratoService.obterVariaveisParaTemplate(user.id, eventoId);
      // Mesclar: variáveis do evento primeiro, depois dados manuais (dados manuais sobrescrevem)
      // Isso garante que sempre temos os dados mais recentes do evento, mas permite edição manual
      dados = { ...variaveisEvento, ...dadosPreenchidos };
    } else {
      // Se não houver eventoId, obter apenas variáveis de configuração + customizadas
      const { VariavelContratoService } = await import('@/lib/services/variavel-contrato-service');
      const variaveisBase = await VariavelContratoService.obterTodasVariaveisDisponiveis(user.id);
      // Mesclar: dados manuais têm prioridade
      dados = { ...variaveisBase, ...dadosPreenchidos };
    }

    const { ContratoService } = await import('@/lib/services/contrato-service');
    const html = ContratoService.processarTemplate(template, dados);

    return createApiResponse({ html });
  } catch (error) {
    return handleApiError(error);
  }
}

