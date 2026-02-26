import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import {
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRouteParams
} from '@/lib/api/route-helpers';

/** Timeout maior para descompressão do Chromium + renderização do PDF (Vercel). */
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    
    console.log(`[PDF] Iniciando geração de PDF para contrato ${id}`);
    
    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(id, user.id);

    if (!contrato) {
      console.error(`[PDF] Contrato ${id} não encontrado`);
      return createErrorResponse('Contrato não encontrado', 404);
    }

    const modeloRepo = repositoryFactory.getModeloContratoRepository();
    const modelo = await modeloRepo.findById(contrato.modeloContratoId);
    if (!modelo) {
      console.error(`[PDF] Modelo ${contrato.modeloContratoId} não encontrado`);
      return createErrorResponse('Modelo de contrato não encontrado', 404);
    }
    
    console.log(`[PDF] Contrato e modelo encontrados. Status: ${contrato.status}`);

    const { ContratoService } = await import('@/lib/services/contrato-service');
    const { PDFService } = await import('@/lib/services/pdf-service');
    
    // Usar HTML editado pelo usuário, se houver; senão, processar o template
    let html: string;
    try {
      if (contrato.conteudoHtml && contrato.conteudoHtml.trim()) {
        html = contrato.conteudoHtml;
      } else {
        const dadosPreenchidosComNumero = {
          ...contrato.dadosPreenchidos,
          numero_contrato: contrato.numeroContrato || ''
        };
        html = ContratoService.processarTemplate(modelo.template, dadosPreenchidosComNumero);
      }

      if (!html || !html.trim()) {
        return createErrorResponse('HTML do contrato está vazio', 400);
      }
    } catch (error: any) {
      console.error('Erro ao processar HTML do contrato:', error);
      return createErrorResponse(`Erro ao processar template: ${error.message}`, 500);
    }

    console.log(`[PDF] HTML processado. Tamanho: ${html.length} caracteres`);
    
    let url: string;
    let path: string;
    try {
      console.log(`[PDF] Chamando PDFService.gerarPDFContrato...`);
      const resultado = await PDFService.gerarPDFContrato(contrato, html);
      url = resultado.url;
      path = resultado.path;
      console.log(`[PDF] PDF gerado com sucesso. URL: ${url}`);
    } catch (error: any) {
      console.error('[PDF] Erro detalhado ao gerar PDF:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        contratoId: id,
        userId: user.id
      });
      return createErrorResponse(
        `Erro ao gerar PDF: ${error.message || 'Erro desconhecido'}. Verifique os logs do servidor para mais detalhes.`,
        500
      );
    }

    try {
      const atualizado = await contratoRepo.update(id, {
        pdfUrl: url,
        pdfPath: path,
        status: 'gerado',
        dataGeracao: new Date(),
        userId: user.id
      });
      
      console.log(`[PDF] Contrato atualizado com sucesso. Status: ${atualizado.status}`);
      return createApiResponse(atualizado);
    } catch (error: any) {
      console.error('[PDF] Erro ao atualizar contrato após gerar PDF:', error);
      // Mesmo que falhe ao atualizar, retornar sucesso com os dados do PDF
      return createApiResponse({
        ...contrato,
        pdfUrl: url,
        pdfPath: path,
        status: 'gerado',
        dataGeracao: new Date()
      });
    }
  } catch (error) {
    console.error('[PDF] Erro geral na rota:', error);
    return handleApiError(error);
  }
}

