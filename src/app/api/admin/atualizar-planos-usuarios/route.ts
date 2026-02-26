import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';

/**
 * Endpoint para atualizar planos e funcionalidades de todos os usuários
 * 
 * Este endpoint:
 * 1. Busca todas as assinaturas (ativas ou todas, dependendo do parâmetro)
 * 2. Para cada assinatura, busca o plano atualizado
 * 3. Atualiza a assinatura com as novas funcionalidades do plano
 * 4. Sincroniza o plano no usuário
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

    const { apenasAtivas = true, dryRun = false } = await request.json().catch(() => ({}));

    const assinaturaRepo = new AdminAssinaturaRepository();
    const planoRepo = new AdminPlanoRepository();
    const userRepo = new AdminUserRepository();
    const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);

    // Buscar assinaturas
    let assinaturas;
    if (apenasAtivas) {
      assinaturas = await assinaturaRepo.findAtivas();
      console.log(`📋 Encontradas ${assinaturas.length} assinatura(s) ativa(s)`);
    } else {
      assinaturas = await assinaturaRepo.findAll();
      console.log(`📋 Encontradas ${assinaturas.length} assinatura(s) no total`);
    }

    const resultados = {
      processadas: 0,
      atualizadas: 0,
      erros: 0,
      detalhes: [] as Array<{
        userId: string;
        assinaturaId: string;
        planoId?: string;
        planoNome?: string;
        status: 'sucesso' | 'erro';
        mensagem: string;
      }>
    };

    // Processar cada assinatura
    for (const assinatura of assinaturas) {
      try {
        resultados.processadas++;
        
        console.log(`🔄 Processando assinatura ${assinatura.id} do usuário ${assinatura.userId}`);

        // Buscar plano atualizado
        let plano = null;
        if (assinatura.planoId) {
          plano = await planoRepo.findById(assinatura.planoId);
          
          if (!plano) {
            const erro = `Plano ${assinatura.planoId} não encontrado`;
            console.error(`  ❌ ${erro}`);
            resultados.erros++;
            resultados.detalhes.push({
              userId: assinatura.userId,
              assinaturaId: assinatura.id,
              planoId: assinatura.planoId,
              status: 'erro',
              mensagem: erro
            });
            continue;
          }

          // Verificar se as funcionalidades mudaram
          const funcionalidadesAtuais = assinatura.funcionalidadesHabilitadas || [];
          const funcionalidadesNovas = plano.funcionalidades || [];
          
          const funcionalidadesIguais = 
            funcionalidadesAtuais.length === funcionalidadesNovas.length &&
            funcionalidadesAtuais.every(f => funcionalidadesNovas.includes(f));

          if (funcionalidadesIguais && !dryRun) {
            console.log(`  ⏭️  Funcionalidades já estão atualizadas, apenas sincronizando usuário...`);
          } else {
            if (!dryRun) {
              // Atualizar assinatura com novas funcionalidades
              const agora = new Date();
              await assinaturaRepo.update(assinatura.id, {
                ...assinatura,
                funcionalidadesHabilitadas: funcionalidadesNovas,
                dataAtualizacao: agora
              });

              // Adicionar ao histórico
              await assinaturaRepo.addHistorico(assinatura.id, {
                data: agora,
                acao: 'Funcionalidades do plano atualizadas',
                detalhes: {
                  funcionalidadesAnteriores: funcionalidadesAtuais.length,
                  funcionalidadesNovas: funcionalidadesNovas.length,
                  planoId: plano.id,
                  planoNome: plano.nome
                }
              });

              console.log(`  ✅ Assinatura atualizada: ${funcionalidadesAtuais.length} → ${funcionalidadesNovas.length} funcionalidades`);
            } else {
              console.log(`  🔍 [DRY RUN] Assinatura seria atualizada: ${funcionalidadesAtuais.length} → ${funcionalidadesNovas.length} funcionalidades`);
            }
          }
        } else {
          console.log(`  ⚠️  Assinatura sem planoId, apenas sincronizando usuário...`);
        }

        // Sincronizar plano no usuário
        if (!dryRun) {
          const userAtualizado = await assinaturaService.sincronizarPlanoUsuario(assinatura.userId);
          
          console.log(`  ✅ Usuário sincronizado: planoId=${userAtualizado.assinatura?.planoId}, planoNome=${userAtualizado.assinatura?.planoNome}`);
          
          resultados.atualizadas++;
          resultados.detalhes.push({
            userId: assinatura.userId,
            assinaturaId: assinatura.id,
            planoId: plano?.id,
            planoNome: plano?.nome,
            status: 'sucesso',
            mensagem: `Atualizado com ${plano?.funcionalidades?.length || 0} funcionalidades`
          });
        } else {
          console.log(`  🔍 [DRY RUN] Usuário seria sincronizado`);
          resultados.atualizadas++;
          resultados.detalhes.push({
            userId: assinatura.userId,
            assinaturaId: assinatura.id,
            planoId: plano?.id,
            planoNome: plano?.nome,
            status: 'sucesso',
            mensagem: `[DRY RUN] Seria atualizado com ${plano?.funcionalidades?.length || 0} funcionalidades`
          });
        }

      } catch (error: any) {
        console.error(`  ❌ Erro ao processar assinatura ${assinatura.id}:`, error);
        resultados.erros++;
        resultados.detalhes.push({
          userId: assinatura.userId,
          assinaturaId: assinatura.id,
          planoId: assinatura.planoId,
          status: 'erro',
          mensagem: error.message || 'Erro desconhecido'
        });
      }
    }

    const mensagem = dryRun 
      ? `[DRY RUN] Simulação concluída: ${resultados.processadas} assinatura(s) processada(s)`
      : `Atualização concluída: ${resultados.atualizadas} assinatura(s) atualizada(s)`;

    return NextResponse.json({
      success: true,
      message: mensagem,
      dryRun,
      apenasAtivas,
      estatisticas: {
        totalProcessadas: resultados.processadas,
        atualizadas: resultados.atualizadas,
        erros: resultados.erros
      },
      detalhes: resultados.detalhes
    });

  } catch (error: any) {
    console.error('Erro ao atualizar planos dos usuários:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar planos dos usuários' },
      { status: 500 }
    );
  }
}

