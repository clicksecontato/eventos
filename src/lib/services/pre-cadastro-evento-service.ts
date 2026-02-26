import { PreCadastroEvento, PreCadastroServico, StatusPreCadastro, Evento, Cliente, ServicoEvento, StatusEvento } from '@/types';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { dataService } from '@/lib/data-service';
import { getDiaSemana, dateToLocalMidnight, parseLocalDate } from '@/lib/utils/date-helpers';

export class PreCadastroEventoService {
  /**
   * Gera um link de pré-cadastro e cria registro pendente
   */
  static async gerarLinkPreCadastro(userId: string, nomeEvento: string): Promise<{ id: string; link: string }> {
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    
    // Criar pré-cadastro com expiração de 7 dias e nome do evento
    const preCadastro = await preCadastroRepo.createComExpiracao(userId, nomeEvento);
    
    // Gerar link completo
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const link = `${baseUrl}/pre-cadastro/${preCadastro.id}`;
    
    return {
      id: preCadastro.id,
      link: String(link) // Garantir que é string
    };
  }

  /**
   * Valida expiração de um pré-cadastro (público)
   */
  static async validarExpiracao(preCadastroId: string): Promise<boolean> {
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    
    try {
      const preCadastro = await preCadastroRepo.findByIdPublic(preCadastroId);
      if (!preCadastro) return false;
      
      // O método findByIdPublic já atualiza o status se expirado
      return preCadastro.status !== StatusPreCadastro.EXPIRADO;
    } catch (error) {
      console.error('Erro ao validar expiração:', error);
      return false;
    }
  }

  /**
   * Busca pré-cadastro por ID (público)
   */
  static async buscarPorIdPublic(preCadastroId: string): Promise<PreCadastroEvento | null> {
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    const servicoRepo = repositoryFactory.getPreCadastroServicoRepository();
    
    const preCadastro = await preCadastroRepo.findByIdPublic(preCadastroId);
    if (!preCadastro) return null;
    
    // Carregar serviços
    const servicos = await servicoRepo.findByPreCadastroIdPublic(preCadastroId);
    preCadastro.servicos = servicos;
    
    return preCadastro;
  }

  /**
   * Salva dados do pré-cadastro preenchidos pelo cliente
   */
  static async salvarPreCadastro(
    preCadastroId: string,
    dados: Partial<PreCadastroEvento>,
    servicosIds?: string[]
  ): Promise<PreCadastroEvento> {
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    const servicoRepo = repositoryFactory.getPreCadastroServicoRepository();
    
    // Buscar pré-cadastro atual
    const preCadastroAtual = await preCadastroRepo.findByIdPublic(preCadastroId);
    if (!preCadastroAtual) {
      throw new Error('Pré-cadastro não encontrado');
    }
    
    // Validar que não está expirado
    if (preCadastroAtual.status === StatusPreCadastro.EXPIRADO) {
      throw new Error('Este link de pré-cadastro expirou. Por favor, entre em contato com o dono da conta.');
    }
    
    // Validar que está pendente
    if (preCadastroAtual.status !== StatusPreCadastro.PENDENTE) {
      throw new Error('Este pré-cadastro já foi preenchido anteriormente.');
    }
    
    // Preparar dados para atualização
    const dadosAtualizacao: Partial<PreCadastroEvento> = {
      ...dados,
      status: StatusPreCadastro.PREENCHIDO,
      dataPreenchimento: new Date(),
      dataAtualizacao: new Date(),
    };
    
    // Atualizar pré-cadastro
    const preCadastroAtualizado = await preCadastroRepo.updatePreCadastro(preCadastroId, dadosAtualizacao, preCadastroAtual.userId);
    
    // Salvar serviços se fornecidos
    if (servicosIds && servicosIds.length > 0) {
      // Deletar serviços antigos
      await servicoRepo.deleteByPreCadastroId(preCadastroAtual.userId, preCadastroId);
      
      // Criar novos serviços
      const servicosParaSalvar = servicosIds.map(tipoServicoId => ({
        tipoServicoId,
        removido: false,
      }));
      
      await servicoRepo.createMultiplos(preCadastroAtual.userId, preCadastroId, servicosParaSalvar);
    }
    
    // Buscar pré-cadastro atualizado com serviços
    const servicos = await servicoRepo.findByPreCadastroId(preCadastroAtual.userId, preCadastroId);
    preCadastroAtualizado.servicos = servicos;
    
    return preCadastroAtualizado;
  }

  /**
   * Converte pré-cadastro em evento
   * Verifica se cliente existe por email, cria se não existir
   * Copia serviços do pré-cadastro para o evento
   */
  static async converterEmEvento(preCadastroId: string, userId: string): Promise<{ evento: Evento; cliente: Cliente; clienteNovo: boolean }> {
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    const servicoRepo = repositoryFactory.getPreCadastroServicoRepository();
    const clienteRepo = repositoryFactory.getClienteRepository();
    const servicoEventoRepo = repositoryFactory.getServicoEventoRepository();
    
    // Buscar pré-cadastro
    const preCadastro = await preCadastroRepo.findById(preCadastroId, userId);
    if (!preCadastro) {
      throw new Error('Pré-cadastro não encontrado');
    }
    
    // Carregar serviços do pré-cadastro
    preCadastro.servicos = await servicoRepo.findByPreCadastroId(userId, preCadastroId);
    console.log(`[PreCadastroEventoService] Pré-cadastro encontrado com ${preCadastro.servicos?.length || 0} serviços`);
    
    // Verificar se já foi convertido (verificar primeiro)
    if (preCadastro.status === StatusPreCadastro.CONVERTIDO) {
      throw new Error('Este pré-cadastro já foi convertido em evento');
    }
    
    // Validar que está preenchido
    if (preCadastro.status !== StatusPreCadastro.PREENCHIDO) {
      throw new Error('Apenas pré-cadastros preenchidos podem ser convertidos em eventos');
    }
    
    // Verificar se email do cliente foi preenchido
    if (!preCadastro.clienteEmail) {
      throw new Error('Email do cliente é obrigatório para criar evento');
    }
    
    // Buscar ou criar cliente
    let cliente: Cliente;
    let clienteNovo = false;
    
    const emailNormalizado = preCadastro.clienteEmail.toLowerCase().trim();
    const clienteExistente = await clienteRepo.findByEmail(emailNormalizado, userId);
    
    if (clienteExistente) {
      // Usar cliente existente
      cliente = clienteExistente;
      console.log(`[PreCadastroEventoService] Usando cliente existente: ${cliente.nome} (${cliente.email})`);
    } else {
      // Criar novo cliente
      clienteNovo = true;
      const novoCliente = {
        nome: preCadastro.clienteNome || '',
        cpf: preCadastro.clienteCpf || '',
        email: emailNormalizado,
        telefone: preCadastro.clienteTelefone || '',
        endereco: preCadastro.clienteEndereco || '',
        cep: preCadastro.clienteCep || '',
        instagram: preCadastro.clienteInstagram,
        canalEntradaId: preCadastro.clienteCanalEntradaId,
      };
      
      try {
        // Criar cliente sem validar plano (é parte da criação do evento)
        cliente = await dataService.createCliente(novoCliente, userId, true);
        console.log(`[PreCadastroEventoService] Cliente criado: ${cliente.nome} (${cliente.email})`);
      } catch (error: any) {
        // Para outros erros (ex: email duplicado), propagar
        throw error;
      }
    }
    
    // Criar evento
    if (!preCadastro.dataEvento) {
      throw new Error('Data do evento é obrigatória');
    }
    
    if (!preCadastro.local) {
      throw new Error('Local do evento é obrigatório');
    }
    
    if (!preCadastro.endereco) {
      throw new Error('Endereço do evento é obrigatório');
    }
    
    if (!preCadastro.tipoEvento) {
      throw new Error('Tipo de evento é obrigatório');
    }
    
    // A data do pré-cadastro vem do banco como UTC (ex: 2026-01-31T00:00:00Z)
    // Precisamos criar uma data local a partir dos componentes UTC para que,
    // quando salva com toISOString(), resulte em 2026-01-31T03:00:00Z (igual ao formulário)
    if (!preCadastro.dataEvento) {
      throw new Error('Data do evento inválida');
    }
    
    let dataEvento: Date;
    if (preCadastro.dataEvento instanceof Date) {
      // Extrair ano, mês e dia da data (que pode estar em UTC ou local)
      // e criar uma nova data local à meia-noite
      const year = preCadastro.dataEvento.getUTCFullYear();
      const month = preCadastro.dataEvento.getUTCMonth();
      const day = preCadastro.dataEvento.getUTCDate();
      // Criar data local à meia-noite (igual ao parseLocalDate)
      dataEvento = new Date(year, month, day, 0, 0, 0, 0);
    } else if (typeof preCadastro.dataEvento === 'string') {
      // Se for string, converter usando parseLocalDate
      dataEvento = parseLocalDate(preCadastro.dataEvento);
    } else {
      throw new Error('Data do evento inválida');
    }
    const eventoData: Omit<Evento, 'id' | 'dataCadastro' | 'dataAtualizacao'> = {
      nomeEvento: preCadastro.nomeEvento,
      clienteId: cliente.id,
      cliente, // Incluído para satisfazer o tipo, mas não será salvo no banco (apenas clienteId)
      dataEvento,
      diaSemana: getDiaSemana(dataEvento),
      local: preCadastro.local,
      endereco: preCadastro.endereco,
      tipoEvento: preCadastro.tipoEvento,
      tipoEventoId: preCadastro.tipoEventoId,
      saida: '', // Não preenchido no pré-cadastro
      chegadaNoLocal: '', // Não preenchido no pré-cadastro
      horarioInicio: preCadastro.horarioInicio || '',
      horarioDesmontagem: preCadastro.horarioTermino || '', // horarioTermino do pré-cadastro = horarioDesmontagem do evento
      tempoEvento: '', // Será calculado depois se necessário
      contratante: preCadastro.contratante || cliente.nome,
      numeroConvidados: preCadastro.numeroConvidados || 0,
      quantidadeMesas: preCadastro.quantidadeMesas,
      hashtag: preCadastro.hashtag,
      numeroImpressoes: undefined,
      cerimonialista: preCadastro.cerimonialista,
      observacoes: preCadastro.observacoes,
      status: StatusEvento.AGENDADO,
      valorTotal: 0, // Será preenchido depois
      diaFinalPagamento: new Date(dataEvento.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias após o evento como padrão
    };
    
    // Criar evento sem validar plano (é parte do fluxo de pré-cadastro)
    const evento = await dataService.createEvento(eventoData, userId, true);
    console.log(`[PreCadastroEventoService] Evento criado: ${evento.id}`);
    
    // Copiar serviços do pré-cadastro para o evento
    if (preCadastro.servicos && preCadastro.servicos.length > 0) {
      const servicosParaCopiar = preCadastro.servicos
        .filter(servico => !servico.removido && servico.tipoServicoId)
        .map(servico => ({
          tipoServicoId: servico.tipoServicoId,
          observacoes: servico.observacoes || undefined,
          removido: false,
          eventoId: evento.id,
          tipoServico: {} as any, // Será carregado pelo repositório
        } as Omit<ServicoEvento, 'id' | 'dataCadastro'>));
      
      console.log(`[PreCadastroEventoService] Preparando para copiar ${servicosParaCopiar.length} serviços para o evento ${evento.id}`);
      
      for (const servicoData of servicosParaCopiar) {
        try {
          await servicoEventoRepo.createServicoEvento(userId, evento.id, servicoData);
          console.log(`[PreCadastroEventoService] Serviço ${servicoData.tipoServicoId} copiado com sucesso`);
        } catch (error: any) {
          console.error(`[PreCadastroEventoService] Erro ao copiar serviço ${servicoData.tipoServicoId}:`, error);
          // Continuar com os outros serviços mesmo se um falhar
        }
      }
      
      console.log(`[PreCadastroEventoService] ${servicosParaCopiar.length} serviços copiados para o evento`);
    } else {
      console.log(`[PreCadastroEventoService] Nenhum serviço encontrado no pré-cadastro para copiar`);
    }
    
    // Atualizar pré-cadastro: status = convertido, eventoId, clienteId
    await preCadastroRepo.updatePreCadastro(preCadastroId, {
      status: StatusPreCadastro.CONVERTIDO,
      eventoId: evento.id,
      clienteId: cliente.id,
      dataConversao: new Date(),
      dataAtualizacao: new Date(),
    }, userId);
    
    return {
      evento,
      cliente,
      clienteNovo
    };
  }

  /**
   * Marca pré-cadastro como ignorado
   */
  static async marcarComoIgnorado(preCadastroId: string, userId: string): Promise<void> {
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    
    await preCadastroRepo.updatePreCadastro(preCadastroId, {
      status: StatusPreCadastro.IGNORADO,
      dataAtualizacao: new Date(),
    }, userId);
  }

  /**
   * Renova expiração adicionando mais 7 dias
   */
  static async renovarExpiracao(preCadastroId: string, userId: string): Promise<PreCadastroEvento> {
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    
    return preCadastroRepo.renovarExpiracao(preCadastroId, userId);
  }

  /**
   * Conta pré-cadastros por status
   */
  static async contarPorStatus(userId: string): Promise<Record<StatusPreCadastro, number>> {
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    
    return preCadastroRepo.contarPorStatus(userId);
  }

  /**
   * Lista pré-cadastros do usuário com filtros
   */
  static async listar(userId: string, filtros?: { status?: StatusPreCadastro }): Promise<PreCadastroEvento[]> {
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    const servicoRepo = repositoryFactory.getPreCadastroServicoRepository();
    
    const preCadastros = await preCadastroRepo.findAll(userId, filtros);
    
    // Carregar serviços para cada pré-cadastro
    for (const preCadastro of preCadastros) {
      preCadastro.servicos = await servicoRepo.findByPreCadastroId(userId, preCadastro.id);
    }
    
    return preCadastros;
  }

  /**
   * Gera link completo para um pré-cadastro
   */
  static gerarLinkCompleto(preCadastroId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/pre-cadastro/${preCadastroId}`;
  }

  /**
   * Deleta pré-cadastro (e seus serviços)
   */
  static async deletar(preCadastroId: string, userId: string): Promise<void> {
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    const servicoRepo = repositoryFactory.getPreCadastroServicoRepository();
    
    // Validar que pertence ao userId
    const preCadastro = await preCadastroRepo.findById(preCadastroId, userId);
    if (!preCadastro) {
      throw new Error('Pré-cadastro não encontrado');
    }
    
    // Não permitir deletar se já foi convertido em evento (opcional - pode remover se quiser)
    if (preCadastro.status === StatusPreCadastro.CONVERTIDO) {
      throw new Error('Não é possível deletar um pré-cadastro que já foi convertido em evento');
    }
    
    // Deletar serviços primeiro
    await servicoRepo.deleteByPreCadastroId(userId, preCadastroId);
    
    // Deletar pré-cadastro
    await preCadastroRepo.deletePreCadastro(preCadastroId, userId);
  }
}
