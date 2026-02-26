import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { UserRepository } from '@/lib/repositories/user-repository';
import { PlanoRepository } from '@/lib/repositories/plano-repository';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { StatusAssinatura } from '@/types/funcionalidades';

export async function POST(request: NextRequest) {
  try {
    // Verificar se há um token de segurança no header (para uso via Postman/API)
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
    const isDevMode = process.env.NODE_ENV === 'development';
    
    // Tentar autenticação via sessão primeiro
    const session = await getServerSession(authOptions);
    
    // Se não houver sessão, verificar se é modo dev ou tem API key válida
    if (!session || session.user?.role !== 'admin') {
      // Verificar se tem API key válida (para uso via Postman)
      if (apiKey) {
        const validApiKey = process.env.SEED_API_KEY || 'dev-seed-key-2024';
        if (apiKey !== validApiKey && !apiKey.includes(validApiKey)) {
          return NextResponse.json({ error: 'API key inválida' }, { status: 401 });
        }
        // API key válida, continuar sem verificação de role
      } else if (!isDevMode) {
        // Em produção, requer autenticação
        return NextResponse.json({ 
          error: 'Não autorizado. Em produção, use autenticação admin ou forneça x-api-key header' 
        }, { status: 401 });
      }
      // Em desenvolvimento, permitir sem autenticação
    }

    const body = await request.json();
    const {
      planoPadrao = 'BASICO_MENSAL',
      statusPadrao = 'active' as StatusAssinatura,
      dataExpiracao = null as Date | null,
      dryRun = false
    } = body;

    const userRepo = new UserRepository();
    const planoRepo = new PlanoRepository();
    const assinaturaService = new AssinaturaService();

    // Buscar plano padrão
    const plano = await planoRepo.findByCodigoHotmart(planoPadrao);
    if (!plano) {
      return NextResponse.json(
        { error: `Plano com código ${planoPadrao} não encontrado` },
        { status: 404 }
      );
    }

    // Buscar todos os usuários
    const usuarios = await userRepo.findAll();
    
    // Filtrar usuários que não têm plano ou assinatura
    const usuariosSemPlano = usuarios.filter(u => {
      // Admin sempre tem acesso, não precisa migrar
      if (u.role === 'admin') {
        return false;
      }
      
      // Usuários sem assinatura ou sem planoId
      return !u.assinatura?.id || !u.assinatura?.planoId;
    });

    if (usuariosSemPlano.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum usuário precisa de migração',
        usuariosMigrados: 0,
        assinaturasCriadas: 0,
        erros: []
      });
    }

    if (dryRun) {
      // Apenas simular, não aplicar mudanças
      return NextResponse.json({
        success: true,
        message: 'Dry run - simulação apenas',
        dryRun: true,
        usuariosParaMigrar: usuariosSemPlano.length,
        usuariosDetalhes: usuariosSemPlano.map(u => ({
          id: u.id,
          email: u.email,
          nome: u.nome,
          temAssinatura: !!u.assinatura?.id,
          temPlanoId: !!u.assinatura?.planoId,
          planoAtribuido: plano.nome
        })),
        planoPadrao: plano.nome,
        statusPadrao
      });
    }

    // Executar migração
    const usuariosMigrados: string[] = [];
    const assinaturasCriadas: string[] = [];
    const erros: Array<{ usuarioId: string; email: string; erro: string }> = [];

    for (const usuario of usuariosSemPlano) {
      try {
        // Verificar se já tem assinatura ativa
        const assinaturaExistente = await assinaturaService['assinaturaRepo'].findByUserId(usuario.id);
        
        if (assinaturaExistente && (assinaturaExistente.status === 'active' || assinaturaExistente.status === 'trial')) {
          // Já tem assinatura ativa, apenas sincronizar
          await assinaturaService.sincronizarPlanoUsuario(usuario.id);
          usuariosMigrados.push(usuario.id);
          continue;
        }

        // Criar nova assinatura
        let dataFim: Date | undefined;
        if (dataExpiracao) {
          dataFim = new Date(dataExpiracao);
        } else if (statusPadrao === 'trial') {
          // Trial de 7 dias por padrão
          dataFim = new Date();
          dataFim.setDate(dataFim.getDate() + 7);
        }

        const assinatura = await assinaturaService.criarAssinaturaUsuario(
          usuario.id,
          plano.id,
          statusPadrao
        );

        assinaturasCriadas.push(assinatura.id);
        usuariosMigrados.push(usuario.id);
      } catch (error: any) {
        erros.push({
          usuarioId: usuario.id,
          email: usuario.email,
          erro: error.message || 'Erro desconhecido'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migração concluída: ${usuariosMigrados.length} usuário(s) migrado(s)`,
      usuariosMigrados: usuariosMigrados.length,
      assinaturasCriadas: assinaturasCriadas.length,
      erros: erros.length > 0 ? erros : undefined,
      detalhes: {
        planoPadrao: plano.nome,
        statusPadrao,
        totalUsuariosProcessados: usuariosSemPlano.length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao executar migração' },
      { status: 500 }
    );
  }
}

