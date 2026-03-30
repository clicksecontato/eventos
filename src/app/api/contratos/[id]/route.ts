import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { s3Service } from '@/lib/s3-service';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody,
  getRouteParams
} from '@/lib/api/route-helpers';
import { registrarEventoAuditoriaContrato } from '@/lib/services/contrato-auditoria-service';
import type { ContratoSignatarioListagem } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(id, user.id);

    if (!contrato) {
      return createErrorResponse('Contrato não encontrado', 404);
    }

    // Regenerar URL pré-assinada do PDF se o arquivo existir no S3
    if (contrato.pdfPath) {
      try {
        contrato.pdfUrl = await s3Service.getSignedUrl(contrato.pdfPath, 3600 * 24 * 7); // 7 dias
      } catch (error) {
        console.error(`Erro ao gerar URL assinada para PDF ${contrato.pdfPath}:`, error);
      }
    }

    // Popular modeloContrato
    let contratoComModelo = contrato;
    if (contrato.modeloContratoId) {
      try {
        const modeloRepo = repositoryFactory.getModeloContratoRepository();
        const modelo = await modeloRepo.findById(contrato.modeloContratoId);
        if (modelo) {
          contratoComModelo = { ...contrato, modeloContrato: modelo };
        }
      } catch (error) {
        console.error(`Erro ao buscar modelo ${contrato.modeloContratoId}:`, error);
      }
    }

    // Popular signatários (partes) para exibir contagem/status na UI do detalhe.
    // Mantém o mesmo padrão da listagem (/api/contratos).
    try {
      const parteRepo = repositoryFactory.getContratoParteRepository();
      const arvore = await parteRepo.listarArvorePorContrato(contrato.id, user.id);
      const signatariosListagem: ContratoSignatarioListagem[] = arvore.flatMap((parte) =>
        parte.signatarios.map((s) => ({
          id: s.id,
          nome: s.nome,
          email: s.email,
          status: s.status,
          papelParte: parte.papel,
        }))
      );
      contratoComModelo = { ...contratoComModelo, signatariosListagem };
    } catch (error) {
      console.error(`Erro ao listar signatários do contrato ${contrato.id}:`, error);
    }

    return createApiResponse(contratoComModelo);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    const body = await getRequestBody(request);
    const contratoRepo = repositoryFactory.getContratoRepository();
    
    const contrato = await contratoRepo.findById(id, user.id);
    if (!contrato) {
      return createErrorResponse('Contrato não encontrado', 404);
    }

    if (contrato.status === 'document_closed') {
      return createErrorResponse(
        'Este contrato está com documento fechado e não permite alterações.',
        409
      );
    }

    if (body.dadosPreenchidos && contrato.modeloContratoId) {
      const modeloRepo = repositoryFactory.getModeloContratoRepository();
      const modelo = await modeloRepo.findById(contrato.modeloContratoId);
      if (modelo) {
        const { ContratoService } = await import('@/lib/services/contrato-service');
        const validacao = ContratoService.validarDadosPreenchidos(body.dadosPreenchidos, modelo.campos);
        if (!validacao.valido) {
          return createErrorResponse('Dados inválidos', 400, { erros: validacao.erros });
        }
      }
      
      // Garantir que numero_contrato está nos dados preenchidos
      body.dadosPreenchidos = {
        ...body.dadosPreenchidos,
        numero_contrato: contrato.numeroContrato || ''
      };
    }

    const atualizado = await contratoRepo.update(id, {
      ...body,
      dataAtualizacao: new Date(),
      userId: user.id
    });

    if (body.status !== undefined && body.status !== contrato.status) {
      await registrarEventoAuditoriaContrato({
        contratoId: id,
        userId: user.id,
        actorUserId: user.id,
        tipo: 'status_alterado',
        payload: { de: contrato.status, para: atualizado.status },
      });
    }
    if (body.conteudoHtml !== undefined) {
      const tamanho = String(body.conteudoHtml ?? '').length;
      await registrarEventoAuditoriaContrato({
        contratoId: id,
        userId: user.id,
        actorUserId: user.id,
        tipo: 'conteudo_alterado',
        payload: { tamanhoCaracteres: tamanho },
      });
    }
    const chavesMeta = ['dadosPreenchidos', 'observacoes', 'eventoId', 'modeloContratoId'] as const;
    const chavesAlteradas = chavesMeta.filter((k) => body[k] !== undefined);
    if (chavesAlteradas.length > 0) {
      await registrarEventoAuditoriaContrato({
        contratoId: id,
        userId: user.id,
        actorUserId: user.id,
        tipo: 'metadados_alterados',
        payload: { campos: chavesAlteradas },
      });
    }

    // Popular modeloContrato no retorno
    let atualizadoComModelo = atualizado;
    if (atualizado.modeloContratoId) {
      try {
        const modeloRepo = repositoryFactory.getModeloContratoRepository();
        const modelo = await modeloRepo.findById(atualizado.modeloContratoId);
        if (modelo) {
          atualizadoComModelo = { ...atualizado, modeloContrato: modelo };
        }
      } catch (error) {
        console.error(`Erro ao buscar modelo ${atualizado.modeloContratoId}:`, error);
      }
    }

    return createApiResponse(atualizadoComModelo);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    const contratoRepo = repositoryFactory.getContratoRepository();
    await contratoRepo.delete(id);

    return createApiResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

