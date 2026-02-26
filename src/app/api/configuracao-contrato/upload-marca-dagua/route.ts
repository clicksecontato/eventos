import { NextRequest } from 'next/server';
import { s3Service } from '@/lib/s3-service';
import {
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
} from '@/lib/api/route-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return createErrorResponse('Arquivo de marca d\'agua é obrigatório', 400);
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse('Tipo de arquivo inválido. Use PNG, JPG ou WEBP.', 400);
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return createErrorResponse('Arquivo muito grande. Tamanho máximo: 5MB.', 400);
    }

    const upload = await s3Service.uploadFile(file, user.id, 'configuracao-contrato');
    if (!upload.success || !upload.url || !upload.key) {
      return createErrorResponse(upload.error || 'Erro ao enviar marca d\'agua para o S3', 500);
    }

    return createApiResponse({
      url: upload.url,
      s3Key: upload.key,
      nomeArquivo: file.name,
      tamanho: file.size,
      tipo: file.type,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
