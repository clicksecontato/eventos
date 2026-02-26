import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';

/**
 * Endpoint para sincronizar plano/assinatura de um usuário específico.
 * 
 * POST /api/admin/sincronizar-usuario
 * Body: { email: string, cancelar?: boolean }
 * 
 * - Busca o usuário pelo email
 * - Se `cancelar: true`, força o cancelamento da assinatura antes de sincronizar
 * - Sincroniza o cache de assinatura no documento do usuário (controle_users)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
    const isDevMode = process.env.NODE_ENV === 'development';

    if (!session || session.user?.role !== 'admin') {
      if (apiKey) {
        const validApiKey = process.env.SEED_API_KEY || 'dev-seed-key-2024';
        if (apiKey !== validApiKey && !apiKey.includes(validApiKey)) {
          return NextResponse.json({ error: 'API key inválida' }, { status: 401 });
        }
      } else if (!isDevMode) {
        return NextResponse.json({
          error: 'Não autorizado. Em produção, use autenticação admin ou forneça x-api-key header'
        }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const { email, cancelar = false } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Parâmetro "email" é obrigatório' },
        { status: 400 }
      );
    }

    const userRepo = new AdminUserRepository();
    const assinaturaRepo = new AdminAssinaturaRepository();
    const planoRepo = new AdminPlanoRepository();
    const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);

    const user = await userRepo.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json(
        { error: `Usuário não encontrado com email: ${email}` },
        { status: 404 }
      );
    }

    console.log(`[Admin] Sincronizando usuário ${user.id} (${user.email})`);

    const todasAssinaturas = await assinaturaRepo.findAllByUserId(user.id);
    const assinaturaAtiva = todasAssinaturas.find(a => a.status === 'active' || a.status === 'trial');
    const assinaturaMaisRecente = todasAssinaturas.length > 0 ? todasAssinaturas[0] : null;

    let cancelamentoRealizado = false;

    if (cancelar && assinaturaAtiva) {
      console.log(`[Admin] Cancelando assinatura ${assinaturaAtiva.id} (status anterior: ${assinaturaAtiva.status})`);

      await assinaturaRepo.addHistorico(assinaturaAtiva.id, {
        data: new Date(),
        acao: 'Assinatura cancelada manualmente (admin)',
        detalhes: {
          statusAnterior: assinaturaAtiva.status,
          statusNovo: 'cancelled',
          motivo: 'Cancelamento manual via endpoint admin/sincronizar-usuario'
        }
      });

      await assinaturaRepo.atualizarStatus(assinaturaAtiva.id, 'cancelled');
      cancelamentoRealizado = true;
    }

    const userAtualizado = await assinaturaService.sincronizarPlanoUsuario(user.id);

    console.log(`[Admin] Usuário sincronizado: ${user.email}, assinatura.status=${userAtualizado.assinatura?.status || 'sem_assinatura'}`);

    return NextResponse.json({
      success: true,
      message: cancelamentoRealizado
        ? `Assinatura cancelada e usuário sincronizado`
        : `Usuário sincronizado com sucesso`,
      usuario: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        assinaturaAntes: {
          statusCache: user.assinatura?.status || 'sem_assinatura',
          planoNome: user.assinatura?.planoNome || null,
        },
        assinaturaDepois: {
          statusCache: userAtualizado.assinatura?.status || 'sem_assinatura',
          planoNome: userAtualizado.assinatura?.planoNome || null,
        }
      },
      assinaturas: todasAssinaturas.map(a => ({
        id: a.id,
        status: a.status,
        planoId: a.planoId,
        hotmartSubscriptionId: a.hotmartSubscriptionId,
        dataInicio: a.dataInicio,
        dataAtualizacao: a.dataAtualizacao
      })),
      cancelamentoRealizado
    });
  } catch (error: any) {
    console.error('[Admin] Erro ao sincronizar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar usuário' },
      { status: 500 }
    );
  }
}
