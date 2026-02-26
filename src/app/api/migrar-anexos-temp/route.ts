import { NextRequest, NextResponse } from 'next/server';
import { anexoPagamentoRepository } from '@/lib/repositories/anexo-pagamento-repository';
import { FuncionalidadeService } from '@/lib/services/funcionalidade-service';
import { AdminFuncionalidadeRepository } from '@/lib/repositories/admin-funcionalidade-repository';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/api/route-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const funcionalidadeRepo = new AdminFuncionalidadeRepository();
    const assinaturaRepo = new AdminAssinaturaRepository();
    const userRepo = new AdminUserRepository();
    const funcionalidadeService = new FuncionalidadeService(funcionalidadeRepo, assinaturaRepo, userRepo);
    const temPermissao = await funcionalidadeService.verificarPermissao(user.id, 'PAGAMENTOS_COMPROVANTES');
    if (!temPermissao) {
      return createErrorResponse(
        'Esta funcionalidade está disponível apenas no plano Premium.',
        403
      );
    }

    const { eventoId, pagamentoIdTemp, pagamentoIdReal } = await request.json();

    if (!eventoId || !pagamentoIdTemp || !pagamentoIdReal) {
      return NextResponse.json({ 
        error: 'eventoId, pagamentoIdTemp e pagamentoIdReal são obrigatórios' 
      }, { status: 400 });
    }

    const anexosTemp = await anexoPagamentoRepository.getAnexosPorPagamento(
      user.id,
      eventoId,
      pagamentoIdTemp
    );

    if (anexosTemp.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum anexo encontrado para migrar',
        migrados: 0
      });
    }

    // Migrar cada anexo
    const anexosMigrados = [];
    
    for (const anexo of anexosTemp) {
      try {
        // Criar novo anexo com o ID correto do pagamento
        const novoAnexo = await anexoPagamentoRepository.createAnexo(
          user.id,
          eventoId,
          pagamentoIdReal,
          {
            userId: anexo.userId,
            eventoId: anexo.eventoId,
            pagamentoId: pagamentoIdReal,
            nome: anexo.nome,
            tipo: anexo.tipo,
            tamanho: anexo.tamanho,
            s3Key: anexo.s3Key,
            url: anexo.url,
            dataUpload: anexo.dataUpload,
          }
        );

        anexosMigrados.push(novoAnexo);

        // Deletar anexo da pasta temp
        await anexoPagamentoRepository.deleteAnexo(
          user.id,
          eventoId,
          pagamentoIdTemp,
          anexo.id
        );

      } catch (error) {
        console.error(`Erro ao migrar anexo ${anexo.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${anexosMigrados.length} anexos migrados com sucesso`,
      migrados: anexosMigrados.length,
      anexos: anexosMigrados
    });

  } catch (error) {
    console.error('Erro na migração de anexos:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
