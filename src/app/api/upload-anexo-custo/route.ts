import { NextRequest, NextResponse } from 'next/server';
import { s3Service } from '@/lib/s3-service';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { FuncionalidadeService } from '@/lib/services/funcionalidade-service';
import { AdminFuncionalidadeRepository } from '@/lib/repositories/admin-funcionalidade-repository';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import {
  getAuthenticatedUser,
  handleApiError,
  createErrorResponse
} from '@/lib/api/route-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const funcionalidadeRepo = new AdminFuncionalidadeRepository();
    const assinaturaRepo = new AdminAssinaturaRepository();
    const userRepo = new AdminUserRepository();
    const funcionalidadeService = new FuncionalidadeService(funcionalidadeRepo, assinaturaRepo, userRepo);
    const temPermissao = await funcionalidadeService.verificarPermissao(user.id, 'ANEXOS_CUSTO');
    if (!temPermissao) {
      return createErrorResponse(
        'Esta funcionalidade está disponível apenas no plano Premium.',
        403
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const eventoId = formData.get('eventoId') as string;
    const custoId = formData.get('custoId') as string;

    if (!file || !eventoId || !custoId) {
      return createErrorResponse('Arquivo, eventoId e custoId são obrigatórios', 400);
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse('Tipo de arquivo não permitido. Tipos aceitos: JPG, PNG, PDF, DOC, DOCX, TXT', 400);
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return createErrorResponse('Arquivo muito grande. Tamanho máximo: 5MB', 400);
    }

    const uploadResult = await s3Service.uploadFileCusto(
      file,
      user.id,
      eventoId,
      custoId
    );

    if (!uploadResult.success) {
      return createErrorResponse(uploadResult.error || 'Erro no upload', 500);
    }

    const anexoCustoRepo = repositoryFactory.getAnexoCustoRepository();
    const anexoData = {
      userId: user.id,
      eventoId,
      custoId,
      nome: file.name,
      tipo: file.type,
      tamanho: file.size,
      s3Key: uploadResult.key!,
      url: uploadResult.url!,
      dataUpload: new Date(),
    };

    const anexo = await anexoCustoRepo.createAnexo(
      user.id,
      eventoId,
      custoId,
      anexoData
    );

    return NextResponse.json({
      success: true,
      anexo: {
        ...anexo,
        dataUpload: anexo.dataUpload instanceof Date ? anexo.dataUpload.toISOString() : anexo.dataUpload,
        dataCadastro: anexo.dataCadastro instanceof Date ? anexo.dataCadastro.toISOString() : anexo.dataCadastro,
      }
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
