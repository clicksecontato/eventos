import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { s3Service } from '@/lib/s3-service';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getQueryParams
} from '@/lib/api/route-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const queryParams = getQueryParams(request);
    const eventoId = queryParams.get('eventoId');

    if (!eventoId) {
      return createErrorResponse('eventoId é obrigatório', 400);
    }

    // Buscar anexos do evento no Supabase
    const anexoEventoRepo = repositoryFactory.getAnexoEventoRepository();
    const anexos = await anexoEventoRepo.findByEventoId(eventoId);

    // Gerar URLs assinadas para cada anexo (se tiver s3Key) ou usar URL existente
    const anexosComUrls = await Promise.all(
      anexos.map(async (anexo) => {
        const anexoComS3Key = anexo as any;
        // Se tiver s3Key, gerar nova URL assinada (URLs expiram após 7 dias)
        if (anexoComS3Key.s3Key) {
          try {
            const signedUrl = await s3Service.getSignedUrl(anexoComS3Key.s3Key, 3600 * 24 * 7); // 7 dias
            return {
              ...anexo,
              url: signedUrl,
            };
          } catch (error) {
            console.error(`Erro ao gerar URL para anexo ${anexo.id}:`, error);
            // Se falhar, usar URL existente (pode estar expirada, mas é melhor que nada)
            return anexo;
          }
        }
        // Se não tiver s3Key, usar URL existente (pode ser URL direta ou já assinada)
        return anexo;
      })
    );

    // Converter para formato esperado pelo frontend
    const anexosFormatados = anexosComUrls.map(anexo => ({
      id: anexo.id,
      eventoId: anexo.eventoId,
      nome: anexo.nome,
      tipo: anexo.tipo,
      url: anexo.url,
      tamanho: anexo.tamanho,
      dataUpload: anexo.dataUpload instanceof Date 
        ? anexo.dataUpload.toISOString() 
        : anexo.dataUpload,
      evento: anexo.evento || {} as any,
    }));

    return createApiResponse({
      success: true,
      arquivos: anexosFormatados,
    });

  } catch (error) {
    return handleApiError(error);
  }
}
