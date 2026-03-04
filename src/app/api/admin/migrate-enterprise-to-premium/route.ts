import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import type { Assinatura } from '@/types/funcionalidades';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

/**
 * Endpoint para migrar usuários de ENTERPRISE_MENSAL para PREMIUM_MENSAL
 * 
 * Este endpoint:
 * 1. Busca todas as assinaturas com plano ENTERPRISE_MENSAL
 * 2. Busca o novo plano PREMIUM_MENSAL
 * 3. Atualiza as assinaturas para o novo plano
 * 4. Atualiza os usuários (cache)
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

    const { dryRun = false } = await request.json().catch(() => ({}));

    const assinaturaRepo = repositoryFactory.getAssinaturaRepository();
    const planoRepo = repositoryFactory.getPlanoRepository();
    const userRepo = repositoryFactory.getUserRepository();
    const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);

    // Buscar plano antigo (ENTERPRISE_MENSAL)
    const planoAntigo = await planoRepo.findByCodigoHotmart('ENTERPRISE_MENSAL');
    
    // Buscar plano novo (PREMIUM_MENSAL)
    const planoNovo = await planoRepo.findByCodigoHotmart('PREMIUM_MENSAL');

    if (!planoNovo) {
      return NextResponse.json({
        success: false,
        error: 'Plano PREMIUM_MENSAL não encontrado. Execute o seed primeiro.'
      }, { status: 400 });
    }

    // Buscar assinaturas com plano antigo
    let assinaturasParaMigrar: Assinatura[];
    if (planoAntigo) {
      // Buscar assinaturas pelo planoId antigo
      const todasAssinaturas = await assinaturaRepo.findAll();
      assinaturasParaMigrar = todasAssinaturas.filter(a => a.planoId === planoAntigo.id);
    } else {
      // Se não encontrar plano antigo, buscar por códigoHotmart no usuário
      const todosUsuarios = await userRepo.findAll();
      const usuariosComEnterprise = todosUsuarios.filter(
        u => u.assinatura?.planoCodigoHotmart === 'ENTERPRISE_MENSAL' && u.assinatura?.id
      );
      
      const assinaturasIds = usuariosComEnterprise
        .map(u => u.assinatura?.id)
        .filter(Boolean) as string[];
      
      if (assinaturasIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Nenhuma assinatura com ENTERPRISE_MENSAL encontrada',
          dryRun,
          estatisticas: {
            totalProcessadas: 0,
            migradas: 0,
            erros: 0
          },
          detalhes: []
        });
      }

      const assinaturasEncontradas = await Promise.all(
        assinaturasIds.map(id => assinaturaRepo.findById(id))
      );
      assinaturasParaMigrar = assinaturasEncontradas.filter(
        (assinatura): assinatura is Assinatura => Boolean(assinatura)
      );
    }

    console.log(`📋 Encontradas ${assinaturasParaMigrar.length} assinatura(s) com ENTERPRISE_MENSAL`);

    const resultados = {
      processadas: 0,
      migradas: 0,
      erros: 0,
      detalhes: [] as Array<{
        userId: string;
        assinaturaId: string;
        status: 'sucesso' | 'erro';
        mensagem: string;
      }>
    };

    // Processar cada assinatura
    for (const assinatura of assinaturasParaMigrar) {
      try {
        resultados.processadas++;
        
        console.log(`🔄 Processando assinatura ${assinatura.id} do usuário ${assinatura.userId}`);

        if (!dryRun) {
          const agora = new Date();
          
          // Atualizar assinatura
          await assinaturaRepo.update(assinatura.id, {
            ...assinatura,
            planoId: planoNovo.id,
            funcionalidadesHabilitadas: planoNovo.funcionalidades || [],
            dataAtualizacao: agora
          });

          // Adicionar ao histórico
          await assinaturaRepo.addHistorico(assinatura.id, {
            data: agora,
            acao: 'Migração: ENTERPRISE_MENSAL → PREMIUM_MENSAL',
            detalhes: {
              planoAnterior: planoAntigo?.id || 'ENTERPRISE_MENSAL',
              planoNovo: planoNovo.id,
              codigoAnterior: 'ENTERPRISE_MENSAL',
              codigoNovo: 'PREMIUM_MENSAL'
            }
          });

          // Sincronizar plano no usuário
          const userAtualizado = await assinaturaService.sincronizarPlanoUsuario(assinatura.userId);
          
          console.log(`  ✅ Usuário migrado: planoId=${userAtualizado.assinatura?.planoId}, planoCodigoHotmart=${userAtualizado.assinatura?.planoCodigoHotmart}`);
          
          resultados.migradas++;
          resultados.detalhes.push({
            userId: assinatura.userId,
            assinaturaId: assinatura.id,
            status: 'sucesso',
            mensagem: `Migrado de ENTERPRISE_MENSAL para PREMIUM_MENSAL`
          });
        } else {
          console.log(`  🔍 [DRY RUN] Assinatura seria migrada: ENTERPRISE_MENSAL → PREMIUM_MENSAL`);
          resultados.migradas++;
          resultados.detalhes.push({
            userId: assinatura.userId,
            assinaturaId: assinatura.id,
            status: 'sucesso',
            mensagem: `[DRY RUN] Seria migrado de ENTERPRISE_MENSAL para PREMIUM_MENSAL`
          });
        }

      } catch (error: unknown) {
        console.error(`  ❌ Erro ao processar assinatura ${assinatura.id}:`, error);
        resultados.erros++;
        resultados.detalhes.push({
          userId: assinatura.userId,
          assinaturaId: assinatura.id,
          status: 'erro',
          mensagem: getErrorMessage(error)
        });
      }
    }

    const mensagem = dryRun 
      ? `[DRY RUN] Simulação concluída: ${resultados.processadas} assinatura(s) processada(s)`
      : `Migração concluída: ${resultados.migradas} assinatura(s) migrada(s) de ENTERPRISE_MENSAL para PREMIUM_MENSAL`;

    return NextResponse.json({
      success: true,
      message: mensagem,
      dryRun,
      estatisticas: {
        totalProcessadas: resultados.processadas,
        migradas: resultados.migradas,
        erros: resultados.erros
      },
      detalhes: resultados.detalhes
    });

  } catch (error: unknown) {
    console.error('Erro ao migrar planos:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Erro ao migrar planos' },
      { status: 500 }
    );
  }
}

