import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { UserRepository } from '@/lib/repositories/user-repository';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
    const isDevMode = process.env.NODE_ENV === 'development';
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      if (apiKey) {
        const validApiKey = process.env.SEED_API_KEY || 'dev-seed-key-2024';
        if (apiKey !== validApiKey && !apiKey.includes(validApiKey)) {
          return NextResponse.json({ error: 'API key inválida' }, { status: 401 });
        }
      } else if (!isDevMode) {
        return NextResponse.json({ 
          error: 'Não autorizado. Use autenticação admin ou forneça x-api-key header' 
        }, { status: 401 });
      }
    }

    const body = await request.json();
    const { dryRun = false } = body;

    const userRepo = new UserRepository();
    const clienteRepo = repositoryFactory.getClienteRepository();
    const eventoRepo = repositoryFactory.getEventoRepository();
    const tipoServicoRepo = repositoryFactory.getTipoServicoRepository();
    const tipoCustoRepo = repositoryFactory.getTipoCustoRepository();
    const canalEntradaRepo = repositoryFactory.getCanalEntradaRepository();
    const tipoEventoRepo = repositoryFactory.getTipoEventoRepository();

    // Buscar todos os usuários (exceto admin)
    const usuarios = await userRepo.findAll();
    const usuariosParaMigrar = usuarios.filter(u => u.role !== 'admin');

    const resultados = {
      usuariosProcessados: 0,
      clientesAtualizados: 0,
      eventosAtualizados: 0,
      tiposServicoAtualizados: 0,
      tiposCustoAtualizados: 0,
      canaisEntradaAtualizados: 0,
      tiposEventoAtualizados: 0,
      erros: [] as string[],
      detalhes: {
        clientes: [] as string[],
        eventos: [] as string[],
        tiposServico: [] as string[],
        tiposCusto: [] as string[],
        canaisEntrada: [] as string[],
        tiposEvento: [] as string[]
      }
    };

    for (const usuario of usuariosParaMigrar) {
      try {
        resultados.usuariosProcessados++;

        // 1. Migrar Clientes
        const clientes = await clienteRepo.findAll(usuario.id);
        for (const cliente of clientes) {
          const updates: any = {};
          let precisaAtualizar = false;

          if (cliente.arquivado === undefined || cliente.arquivado === null) {
            updates.arquivado = false;
            precisaAtualizar = true;
          }

          if (precisaAtualizar) {
            if (!dryRun) {
              await clienteRepo.updateCliente(cliente.id, updates, usuario.id);
            }
            resultados.clientesAtualizados++;
            resultados.detalhes.clientes.push(`${cliente.nome} (${usuario.email})`);
          }
        }

        // 2. Migrar Eventos
        const eventos = await eventoRepo.findAll(usuario.id);
        for (const evento of eventos) {
          const updates: any = {};
          let precisaAtualizar = false;

          if (evento.arquivado === undefined || evento.arquivado === null) {
            updates.arquivado = false;
            precisaAtualizar = true;
          }

          if (precisaAtualizar) {
            if (!dryRun) {
              await eventoRepo.updateEvento(evento.id, updates, usuario.id);
            }
            resultados.eventosAtualizados++;
            const nomeEvento = evento.nomeEvento || evento.local || evento.tipoEvento || evento.id;
            resultados.detalhes.eventos.push(`${nomeEvento} (${usuario.email})`);
          }
        }

        // 3. Migrar Tipos de Serviço
        const tiposServico = await tipoServicoRepo.findAll(usuario.id);
        for (const tipo of tiposServico) {
          const updates: any = {};
          let precisaAtualizar = false;

          if (tipo.ativo === undefined || tipo.ativo === null) {
            updates.ativo = true;
            precisaAtualizar = true;
          }

          if (precisaAtualizar) {
            if (!dryRun) {
              await tipoServicoRepo.updateTipoServico(tipo.id, updates, usuario.id);
            }
            resultados.tiposServicoAtualizados++;
            resultados.detalhes.tiposServico.push(`${tipo.nome} (${usuario.email})`);
          }
        }

        // 4. Migrar Tipos de Custo
        const tiposCusto = await tipoCustoRepo.findAll(usuario.id);
        for (const tipo of tiposCusto) {
          const updates: any = {};
          let precisaAtualizar = false;

          if (tipo.ativo === undefined || tipo.ativo === null) {
            updates.ativo = true;
            precisaAtualizar = true;
          }

          if (precisaAtualizar) {
            if (!dryRun) {
              await tipoCustoRepo.updateTipoCusto(tipo.id, updates, usuario.id);
            }
            resultados.tiposCustoAtualizados++;
            resultados.detalhes.tiposCusto.push(`${tipo.nome} (${usuario.email})`);
          }
        }

        // 5. Migrar Canais de Entrada
        const canaisEntrada = await canalEntradaRepo.findAll(usuario.id);
        for (const canal of canaisEntrada) {
          const updates: any = {};
          let precisaAtualizar = false;

          if (canal.ativo === undefined || canal.ativo === null) {
            updates.ativo = true;
            precisaAtualizar = true;
          }

          if (precisaAtualizar) {
            if (!dryRun) {
              await canalEntradaRepo.updateCanalEntrada(usuario.id, canal.id, updates);
            }
            resultados.canaisEntradaAtualizados++;
            resultados.detalhes.canaisEntrada.push(`${canal.nome} (${usuario.email})`);
          }
        }

        // 6. Migrar Tipos de Evento
        const tiposEvento = await tipoEventoRepo.findAll(usuario.id);
        for (const tipo of tiposEvento) {
          const updates: any = {};
          let precisaAtualizar = false;

          if (tipo.ativo === undefined || tipo.ativo === null) {
            updates.ativo = true;
            precisaAtualizar = true;
          }

          if (precisaAtualizar) {
            if (!dryRun) {
              await tipoEventoRepo.updateTipoEvento(tipo.id, updates, usuario.id);
            }
            resultados.tiposEventoAtualizados++;
            resultados.detalhes.tiposEvento.push(`${tipo.nome} (${usuario.email})`);
          }
        }
      } catch (error: any) {
        const mensagem = `Erro ao processar usuário ${usuario.email}: ${error.message}`;
        console.error(mensagem, error);
        resultados.erros.push(mensagem);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun 
        ? 'Simulação concluída. Nenhum dado foi alterado.' 
        : 'Migração concluída com sucesso!',
      resumo: {
        usuariosProcessados: resultados.usuariosProcessados,
        totalAtualizacoes: 
          resultados.clientesAtualizados +
          resultados.eventosAtualizados +
          resultados.tiposServicoAtualizados +
          resultados.tiposCustoAtualizados +
          resultados.canaisEntradaAtualizados +
          resultados.tiposEventoAtualizados,
        clientesAtualizados: resultados.clientesAtualizados,
        eventosAtualizados: resultados.eventosAtualizados,
        tiposServicoAtualizados: resultados.tiposServicoAtualizados,
        tiposCustoAtualizados: resultados.tiposCustoAtualizados,
        canaisEntradaAtualizados: resultados.canaisEntradaAtualizados,
        tiposEventoAtualizados: resultados.tiposEventoAtualizados
      },
      detalhes: dryRun ? resultados.detalhes : undefined,
      erros: resultados.erros.length > 0 ? resultados.erros : undefined
    });
  } catch (error: any) {
    console.error('Erro na migração de campos de integridade:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao executar migração', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}
