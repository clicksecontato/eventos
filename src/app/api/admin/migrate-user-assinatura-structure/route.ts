import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { AssinaturaRepository } from '@/lib/repositories/assinatura-repository';
import { UserRepository } from '@/lib/repositories/user-repository';
import { PlanoRepository } from '@/lib/repositories/plano-repository';
import { User, UserAssinatura } from '@/types';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Endpoint para migrar estrutura de assinatura dos usuários
 * 
 * Este endpoint migra os campos antigos de assinatura (espalhados na raiz do User)
 * para o novo objeto consolidado user.assinatura
 * 
 * Campos antigos que serão migrados:
 * - assinaturaId → assinatura.id
 * - planoId → assinatura.planoId
 * - planoNome → assinatura.planoNome
 * - planoCodigoHotmart → assinatura.planoCodigoHotmart
 * - funcionalidadesHabilitadas → assinatura.funcionalidadesHabilitadas
 * - assinaturaStatus → assinatura.status
 * - pagamentoEmDia → assinatura.pagamentoEmDia
 * - dataExpiraAssinatura → assinatura.dataExpira
 * - dataProximoPagamento → assinatura.dataProximoPagamento
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

    const assinaturaService = new AssinaturaService();
    const assinaturaRepo = new AssinaturaRepository();
    const userRepo = new UserRepository();

    // Buscar todos os usuários
    const todosUsuarios = await userRepo.findAll();

    // Filtrar usuários que precisam de migração
    // Usuários que têm campos antigos na raiz OU não têm objeto assinatura
    const usuariosParaMigrar = todosUsuarios.filter((user: any) => {
      // Admin não precisa migrar (não tem assinatura)
      if (user.role === 'admin') {
        return false;
      }

      // Verificar se tem campos antigos na raiz (estrutura antiga)
      // Usar 'any' porque esses campos não estão mais no tipo User, mas podem existir no banco
      const temCamposAntigos = 
        (user as any).assinaturaId !== undefined ||
        (user as any).planoId !== undefined ||
        (user as any).planoNome !== undefined ||
        (user as any).planoCodigoHotmart !== undefined ||
        (user as any).funcionalidadesHabilitadas !== undefined ||
        (user as any).assinaturaStatus !== undefined ||
        (user as any).pagamentoEmDia !== undefined ||
        (user as any).dataExpiraAssinatura !== undefined ||
        (user as any).dataProximoPagamento !== undefined;

      // Verificar se não tem objeto assinatura (estrutura nova)
      const naoTemObjetoAssinatura = !user.assinatura || typeof user.assinatura !== 'object';

      // Precisa migrar se tem campos antigos OU não tem objeto assinatura
      return temCamposAntigos || naoTemObjetoAssinatura;
    });


    if (usuariosParaMigrar.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum usuário precisa de migração. Todos já estão com a estrutura atualizada.',
        usuariosProcessados: 0,
        usuariosMigrados: 0,
        usuariosComErro: 0,
        detalhes: []
      });
    }

    const resultados = {
      usuariosProcessados: 0,
      usuariosMigrados: 0,
      usuariosComErro: 0,
      detalhes: [] as Array<{
        userId: string;
        email: string;
        status: 'sucesso' | 'erro' | 'pulado';
        mensagem: string;
      }>
    };

    // Processar cada usuário
    for (const user of usuariosParaMigrar) {
      try {
        resultados.usuariosProcessados++;

        // Buscar assinatura real na coleção assinaturas
        // Usar 'any' porque user pode ter campos antigos que não estão no tipo
        const userAny = user as any;
        let assinaturaReal = null;
        if (userAny.assinaturaId) {
          // Tentar buscar pelo ID da assinatura
          assinaturaReal = await assinaturaRepo.findById(userAny.assinaturaId);
        }
        
        // Se não encontrou pelo ID, tentar buscar pelo userId
        if (!assinaturaReal) {
          const assinaturas = await assinaturaRepo.findAllByUserId(user.id);
          if (assinaturas.length > 0) {
            // Pegar a mais recente
            assinaturaReal = assinaturas[0];
          }
        }

        if (dryRun) {
          // Dry run - apenas simular
          const temCamposAntigos = 
            userAny.assinaturaId !== undefined ||
            userAny.planoId !== undefined ||
            userAny.planoNome !== undefined ||
            userAny.planoCodigoHotmart !== undefined;

          resultados.detalhes.push({
            userId: user.id,
            email: user.email,
            status: 'pulado',
            mensagem: `[DRY RUN] Seria migrado. Tem campos antigos: ${temCamposAntigos}, Tem assinatura real: ${!!assinaturaReal}`
          });
          continue;
        }

        // Se não tem assinatura real e não tem campos antigos relevantes, apenas limpar
        if (!assinaturaReal && !userAny.assinaturaId && !userAny.planoId) {
          console.log(`  ⏭️  Usuário sem assinatura, apenas limpando campos antigos`);
          
          // Remover campos antigos usando deleteField()
          const userRef = doc(db, 'controle_users', user.id);
          const camposParaDeletar: any = {};
          if (userAny.assinaturaId !== undefined) camposParaDeletar.assinaturaId = deleteField();
          if (userAny.planoId !== undefined) camposParaDeletar.planoId = deleteField();
          if (userAny.planoNome !== undefined) camposParaDeletar.planoNome = deleteField();
          if (userAny.planoCodigoHotmart !== undefined) camposParaDeletar.planoCodigoHotmart = deleteField();
          if (userAny.funcionalidadesHabilitadas !== undefined) camposParaDeletar.funcionalidadesHabilitadas = deleteField();
          if (userAny.assinaturaStatus !== undefined) camposParaDeletar.assinaturaStatus = deleteField();
          if (userAny.pagamentoEmDia !== undefined) camposParaDeletar.pagamentoEmDia = deleteField();
          if (userAny.dataExpiraAssinatura !== undefined) camposParaDeletar.dataExpiraAssinatura = deleteField();
          if (userAny.dataProximoPagamento !== undefined) camposParaDeletar.dataProximoPagamento = deleteField();
          if (userAny.ultimaSincronizacaoPlano !== undefined) camposParaDeletar.ultimaSincronizacaoPlano = deleteField();

          if (Object.keys(camposParaDeletar).length > 0) {
            await updateDoc(userRef, camposParaDeletar);
          }

          resultados.usuariosMigrados++;
          resultados.detalhes.push({
            userId: user.id,
            email: user.email,
            status: 'sucesso',
            mensagem: 'Campos antigos removidos (usuário sem assinatura)'
          });
          continue;
        }

        // Tentar sincronizar primeiro (se houver assinatura ativa, cria o objeto)
        await assinaturaService.sincronizarPlanoUsuario(user.id);
        
        // Verificar se o objeto assinatura foi criado
        let userAposSync = await userRepo.findById(user.id);
        const temObjetoAssinatura = !!userAposSync?.assinatura;
        
        // Se não tem objeto assinatura mas tem campos antigos, criar objeto a partir dos campos antigos
        if (!temObjetoAssinatura && (userAny.planoId || userAny.assinaturaId || userAny.planoCodigoHotmart)) {
          
          // Buscar plano se tiver planoId ou planoCodigoHotmart
          const planoRepo = new PlanoRepository();
          let plano = null;
          
          if (userAny.planoId) {
            plano = await planoRepo.findById(userAny.planoId);
          } else if (userAny.planoCodigoHotmart) {
            plano = await planoRepo.findByCodigoHotmart(userAny.planoCodigoHotmart);
          }
          
          // Mapear status antigo para novo formato
          let statusUser: 'ATIVA' | 'TRIAL' | 'CANCELADA' | 'EXPIRADA' | 'SUSPENSA' | undefined = undefined;
          if (userAny.assinaturaStatus) {
            const statusAntigo = String(userAny.assinaturaStatus).toUpperCase();
            if (statusAntigo === 'ATIVA' || statusAntigo === 'ACTIVE') statusUser = 'ATIVA';
            else if (statusAntigo === 'TRIAL') statusUser = 'TRIAL';
            else if (statusAntigo === 'CANCELADA' || statusAntigo === 'CANCELLED') statusUser = 'CANCELADA';
            else if (statusAntigo === 'EXPIRADA' || statusAntigo === 'EXPIRED') statusUser = 'EXPIRADA';
            else if (statusAntigo === 'SUSPENSA' || statusAntigo === 'SUSPENDED') statusUser = 'SUSPENSA';
          }
          
          // Função auxiliar para remover campos undefined recursivamente
          const removeUndefined = (obj: any): any => {
            if (obj === null || obj === undefined) return null;
            if (Array.isArray(obj)) {
              return obj.map(removeUndefined).filter(item => item !== undefined);
            }
            if (typeof obj === 'object') {
              const cleaned: any = {};
              for (const key in obj) {
                if (obj[key] !== undefined) {
                  cleaned[key] = removeUndefined(obj[key]);
                }
              }
              return cleaned;
            }
            return obj;
          };

          // Construir objeto assinatura a partir dos campos antigos
          // IMPORTANTE: Não incluir campos undefined para evitar erros no Firestore
          const assinaturaMigrada: any = {
            ultimaSincronizacao: new Date()
          };
          
          // Adicionar campos apenas se tiverem valor válido
          if (userAny.assinaturaId) assinaturaMigrada.id = userAny.assinaturaId;
          if (userAny.planoId || plano?.id) assinaturaMigrada.planoId = userAny.planoId || plano?.id;
          if (userAny.planoNome || plano?.nome) assinaturaMigrada.planoNome = userAny.planoNome || plano?.nome;
          if (userAny.planoCodigoHotmart || plano?.codigoHotmart) {
            assinaturaMigrada.planoCodigoHotmart = userAny.planoCodigoHotmart || plano?.codigoHotmart;
          }
          if (Array.isArray(userAny.funcionalidadesHabilitadas) && userAny.funcionalidadesHabilitadas.length > 0) {
            assinaturaMigrada.funcionalidadesHabilitadas = userAny.funcionalidadesHabilitadas;
          }
          if (statusUser) assinaturaMigrada.status = statusUser;
          if (userAny.pagamentoEmDia !== undefined) {
            assinaturaMigrada.pagamentoEmDia = Boolean(userAny.pagamentoEmDia);
          }
          
          // Processar dataExpira
          if (userAny.dataExpiraAssinatura) {
            if (userAny.dataExpiraAssinatura instanceof Date) {
              assinaturaMigrada.dataExpira = userAny.dataExpiraAssinatura;
            } else {
              try {
                const dataExpira = new Date(userAny.dataExpiraAssinatura);
                if (!isNaN(dataExpira.getTime())) {
                  assinaturaMigrada.dataExpira = dataExpira;
                }
              } catch (e) {
                // Ignorar se não conseguir converter
              }
            }
          }
          
          // Processar dataProximoPagamento
          if (userAny.dataProximoPagamento) {
            if (userAny.dataProximoPagamento instanceof Date) {
              assinaturaMigrada.dataProximoPagamento = userAny.dataProximoPagamento;
            } else {
              try {
                const dataProximo = new Date(userAny.dataProximoPagamento);
                if (!isNaN(dataProximo.getTime())) {
                  assinaturaMigrada.dataProximoPagamento = dataProximo;
                }
              } catch (e) {
                // Ignorar se não conseguir converter
              }
            }
          }
          
          // Remover campos undefined recursivamente antes de salvar
          const assinaturaLimpa = removeUndefined(assinaturaMigrada);
          
          // Atualizar usuário com objeto assinatura criado (sem campos undefined)
          await userRepo.update(user.id, {
            assinatura: assinaturaLimpa,
            dataAtualizacao: new Date()
          });
          
          userAposSync = await userRepo.findById(user.id);
          console.log(`  ✅ Objeto assinatura criado a partir de campos antigos`);
        }

        // Agora que garantimos que o objeto assinatura existe (ou foi criado), remover campos antigos
        const userRef = doc(db, 'controle_users', user.id);
        const camposParaDeletar: any = {};
        if (userAny.assinaturaId !== undefined) camposParaDeletar.assinaturaId = deleteField();
        if (userAny.planoId !== undefined) camposParaDeletar.planoId = deleteField();
        if (userAny.planoNome !== undefined) camposParaDeletar.planoNome = deleteField();
        if (userAny.planoCodigoHotmart !== undefined) camposParaDeletar.planoCodigoHotmart = deleteField();
        if (userAny.funcionalidadesHabilitadas !== undefined) camposParaDeletar.funcionalidadesHabilitadas = deleteField();
        if (userAny.assinaturaStatus !== undefined) camposParaDeletar.assinaturaStatus = deleteField();
        if (userAny.pagamentoEmDia !== undefined) camposParaDeletar.pagamentoEmDia = deleteField();
        if (userAny.dataExpiraAssinatura !== undefined) camposParaDeletar.dataExpiraAssinatura = deleteField();
        if (userAny.dataProximoPagamento !== undefined) camposParaDeletar.dataProximoPagamento = deleteField();
        if (userAny.ultimaSincronizacaoPlano !== undefined) camposParaDeletar.ultimaSincronizacaoPlano = deleteField();

        // Só remover campos antigos se tiver objeto assinatura criado
        const userFinal = userAposSync || await userRepo.findById(user.id);
        const temObjetoAssinaturaFinal = !!userFinal?.assinatura;
        
        if (temObjetoAssinaturaFinal && Object.keys(camposParaDeletar).length > 0) {
          await updateDoc(userRef, camposParaDeletar);
          console.log(`  🗑️  Campos antigos removidos: ${Object.keys(camposParaDeletar).join(', ')}`);
        } else if (!temObjetoAssinaturaFinal) {
          console.log(`  ⚠️  Atenção: Não foi possível criar objeto assinatura, mantendo campos antigos`);
        }

        // Verificar resultado final
        const userVerificado = await userRepo.findById(user.id);
        const aindaTemCamposAntigos = 
          (userVerificado as any)?.assinaturaId !== undefined ||
          (userVerificado as any)?.planoId !== undefined;

        if (userVerificado?.assinatura && !aindaTemCamposAntigos) {
          resultados.usuariosMigrados++;
          resultados.detalhes.push({
            userId: user.id,
            email: user.email,
            status: 'sucesso',
            mensagem: `Migrado com sucesso. Plano: ${userVerificado.assinatura?.planoNome || 'N/A'}`
          });
        } else if (userVerificado?.assinatura && aindaTemCamposAntigos) {
          resultados.usuariosMigrados++;
          resultados.detalhes.push({
            userId: user.id,
            email: user.email,
            status: 'sucesso',
            mensagem: `Objeto assinatura criado, mas alguns campos antigos ainda existem (pode ser necessário executar novamente)`
          });
        } else {
          resultados.usuariosComErro++;
          resultados.detalhes.push({
            userId: user.id,
            email: user.email,
            status: 'erro',
            mensagem: 'Não foi possível criar objeto assinatura e não há assinatura ativa na coleção assinaturas'
          });
        }

      } catch (error: any) {
        resultados.usuariosComErro++;
        resultados.detalhes.push({
          userId: user.id,
          email: user.email,
          status: 'erro',
          mensagem: error.message || 'Erro desconhecido'
        });
      }
    }

    const mensagem = dryRun
      ? `[DRY RUN] Simulação concluída: ${resultados.usuariosProcessados} usuário(s) seriam processado(s)`
      : `Migração concluída: ${resultados.usuariosMigrados} usuário(s) migrado(s) com sucesso`;

    return NextResponse.json({
      success: true,
      message: mensagem,
      dryRun,
      estatisticas: {
        totalProcessados: resultados.usuariosProcessados,
        migrados: resultados.usuariosMigrados,
        erros: resultados.usuariosComErro
      },
      detalhes: resultados.detalhes
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao migrar estrutura de assinatura dos usuários' },
      { status: 500 }
    );
  }
}

