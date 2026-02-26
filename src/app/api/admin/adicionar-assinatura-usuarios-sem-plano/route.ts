import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { StatusAssinatura } from '@/types/funcionalidades';

/**
 * Endpoint para adicionar assinatura para usuários que não têm nenhuma assinatura
 * 
 * Este endpoint:
 * 1. Busca todos os usuários (exceto admin)
 * 2. Identifica usuários sem assinatura (nem na coleção assinaturas, nem no objeto user.assinatura)
 * 3. Cria uma assinatura padrão para esses usuários
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
    const isDevMode = process.env.NODE_ENV === 'development';
    
    // Verificar se é admin ou tem API key válida
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
    const {
      planoPadrao = 'BASICO_MENSAL',
      statusPadrao = 'active' as StatusAssinatura,
      dryRun = false
    } = body;

    // Usar repositórios Admin que bypassam as regras de segurança do Firestore
    const userRepo = new AdminUserRepository();
    const planoRepo = new AdminPlanoRepository();
    const assinaturaRepo = new AdminAssinaturaRepository();
    const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);

    // Buscar plano padrão
    const plano = await planoRepo.findByCodigoHotmart(planoPadrao);
    if (!plano) {
      return NextResponse.json(
        { error: `Plano com código ${planoPadrao} não encontrado` },
        { status: 404 }
      );
    }

    // Buscar todos os usuários
    const todosUsuarios = await userRepo.findAll();

    // Filtrar usuários sem assinatura
    const usuariosSemAssinatura: typeof todosUsuarios = [];
    
    for (const user of todosUsuarios) {
      // Admin não precisa de assinatura
      if (user.role === 'admin') {
        continue;
      }

      // Verificar se tem objeto assinatura no user
      const temAssinaturaNoUser = !!user.assinatura?.id;

      // Verificar se tem assinatura na coleção assinaturas
      const assinaturas = await assinaturaRepo.findAllByUserId(user.id);
      const temAssinaturaNaCollection = assinaturas.length > 0;

      // Se não tem em nenhum lugar, adicionar à lista
      if (!temAssinaturaNoUser && !temAssinaturaNaCollection) {
        usuariosSemAssinatura.push(user);
      }
    }


    if (usuariosSemAssinatura.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum usuário sem assinatura encontrado',
        usuariosProcessados: 0,
        assinaturasCriadas: 0,
        detalhes: []
      });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: '[DRY RUN] Simulação apenas',
        dryRun: true,
        usuariosParaProcessar: usuariosSemAssinatura.length,
        usuariosDetalhes: usuariosSemAssinatura.map(u => ({
          id: u.id,
          email: u.email,
          nome: u.nome,
          planoAtribuido: plano.nome,
          statusPadrao
        })),
        planoPadrao: plano.nome,
        statusPadrao
      });
    }

    // Executar criação de assinaturas
    const resultados = {
      usuariosProcessados: 0,
      assinaturasCriadas: 0,
      erros: 0,
      detalhes: [] as Array<{
        userId: string;
        email: string;
        status: 'sucesso' | 'erro';
        mensagem: string;
      }>
    };

    for (const usuario of usuariosSemAssinatura) {
      try {
        resultados.usuariosProcessados++;
        // Criar assinatura para o usuário
        const assinatura = await assinaturaService.criarAssinaturaUsuario(
          usuario.id,
          plano.id,
          statusPadrao
        );

        // Verificar se foi sincronizado no usuário
        const userAtualizado = await userRepo.findById(usuario.id);
        const temAssinatura = !!userAtualizado?.assinatura?.id;

        if (temAssinatura) {
          resultados.assinaturasCriadas++;
          resultados.detalhes.push({
            userId: usuario.id,
            email: usuario.email,
            status: 'sucesso',
            mensagem: `Assinatura criada e sincronizada. Plano: ${plano.nome}`
          });
        } else {
          resultados.erros++;
          resultados.detalhes.push({
            userId: usuario.id,
            email: usuario.email,
            status: 'erro',
            mensagem: 'Assinatura criada mas não foi sincronizada no usuário'
          });
        }

      } catch (error: any) {
        resultados.erros++;
        resultados.detalhes.push({
          userId: usuario.id,
          email: usuario.email,
          status: 'erro',
          mensagem: error.message || 'Erro desconhecido'
        });
      }
    }

    const mensagem = `Processamento concluído: ${resultados.assinaturasCriadas} assinatura(s) criada(s) com sucesso`;

    return NextResponse.json({
      success: true,
      message: mensagem,
      estatisticas: {
        totalProcessados: resultados.usuariosProcessados,
        assinaturasCriadas: resultados.assinaturasCriadas,
        erros: resultados.erros
      },
      detalhes: resultados.detalhes,
      planoPadrao: plano.nome,
      statusPadrao
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao adicionar assinaturas para usuários sem plano' },
      { status: 500 }
    );
  }
}


