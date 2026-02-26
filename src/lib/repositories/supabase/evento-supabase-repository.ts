import { BaseSupabaseRepository } from './base-supabase-repository';
import { Evento, StatusEvento } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { getDiaSemana, dateToUTCMidnight, dateToLocalMidnight } from '@/lib/utils/date-helpers';

export class EventoSupabaseRepository extends BaseSupabaseRepository<Evento> {
  constructor() {
    super('eventos', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): Evento {
    // Converter data do banco (UTC) para timezone local
    const dataEvento = row.data_evento ? dateToLocalMidnight(new Date(row.data_evento)) : new Date();
    // Recalcular dia da semana para garantir que está correto (evita problemas de timezone)
    const diaSemanaCalculado = getDiaSemana(dataEvento);
    
    return {
      id: row.id,
      nomeEvento: row.nome_evento,
      clienteId: row.cliente_id,
      dataEvento,
      diaSemana: diaSemanaCalculado, // Usar o dia calculado em vez do salvo no banco
      local: row.local,
      endereco: row.endereco || '',
      tipoEvento: row.tipo_evento,
      tipoEventoId: row.tipo_evento_id,
      saida: row.saida || '',
      chegadaNoLocal: row.chegada_no_local || '',
      horarioInicio: row.horario_inicio || '',
      horarioDesmontagem: row.horario_desmontagem || '',
      tempoEvento: row.tempo_evento || '',
      contratante: row.contratante || '',
      numeroConvidados: row.numero_convidados || 0,
      quantidadeMesas: row.quantidade_mesas,
      hashtag: row.hashtag,
      numeroImpressoes: row.numero_impressoes,
      cerimonialista: row.cerimonialista as { nome?: string; telefone?: string } | undefined,
      observacoes: row.observacoes,
      status: row.status as Evento['status'],
      valorTotal: parseFloat(row.valor_total) || 0,
      diaFinalPagamento: row.dia_final_pagamento ? new Date(row.dia_final_pagamento) : undefined as any,
      arquivado: row.arquivado || false,
      dataArquivamento: row.data_arquivamento ? new Date(row.data_arquivamento) : undefined,
      motivoArquivamento: row.motivo_arquivamento,
      googleCalendarEventId: row.google_calendar_event_id,
      googleCalendarSyncedAt: row.google_calendar_synced_at ? new Date(row.google_calendar_synced_at) : undefined,
      dataCadastro: new Date(row.data_cadastro),
      dataAtualizacao: new Date(row.data_atualizacao),
      // Cliente será carregado separadamente quando necessário
      cliente: {} as any,
    };
  }

  protected convertToSupabase(entity: Partial<Evento>): any {
    const data: any = {};
    
    if (entity.nomeEvento !== undefined) data.nome_evento = entity.nomeEvento || null;
    if (entity.clienteId !== undefined) data.cliente_id = entity.clienteId;
    // Salvar data usando toISOString() diretamente (mantém consistência com parseLocalDate)
    // parseLocalDate cria data local (ex: 2026-01-31T00:00:00-03:00)
    // toISOString() converte para UTC (ex: 2026-01-31T03:00:00Z)
    if (entity.dataEvento !== undefined) {
      if (entity.dataEvento instanceof Date) {
        data.data_evento = entity.dataEvento.toISOString();
      } else {
        data.data_evento = entity.dataEvento;
      }
    }
    if (entity.diaSemana !== undefined) data.dia_semana = entity.diaSemana || null;
    if (entity.local !== undefined) data.local = entity.local;
    if (entity.endereco !== undefined) data.endereco = entity.endereco || null;
    if (entity.tipoEvento !== undefined) data.tipo_evento = entity.tipoEvento;
    if (entity.tipoEventoId !== undefined) data.tipo_evento_id = entity.tipoEventoId || null;
    if (entity.saida !== undefined) data.saida = entity.saida || null;
    if (entity.chegadaNoLocal !== undefined) data.chegada_no_local = entity.chegadaNoLocal || null;
    if (entity.horarioInicio !== undefined) data.horario_inicio = entity.horarioInicio || null;
    if (entity.horarioDesmontagem !== undefined) data.horario_desmontagem = entity.horarioDesmontagem || null;
    if (entity.tempoEvento !== undefined) data.tempo_evento = entity.tempoEvento || null;
    if (entity.contratante !== undefined) data.contratante = entity.contratante || null;
    if (entity.numeroConvidados !== undefined) data.numero_convidados = entity.numeroConvidados;
    if (entity.quantidadeMesas !== undefined) data.quantidade_mesas = entity.quantidadeMesas || null;
    if (entity.hashtag !== undefined) data.hashtag = entity.hashtag || null;
    if (entity.numeroImpressoes !== undefined) data.numero_impressoes = entity.numeroImpressoes || null;
    if (entity.cerimonialista !== undefined) data.cerimonialista = entity.cerimonialista || null;
    if (entity.observacoes !== undefined) data.observacoes = entity.observacoes || null;
    if (entity.status !== undefined) {
      // Garantir que o status seja uma string válida conforme o constraint do banco
      // Os valores permitidos são: 'Agendado', 'Confirmado', 'Em andamento', 'Concluído', 'Cancelado'
      let statusValido: string;
      
      if (typeof entity.status === 'string') {
        statusValido = entity.status;
      } else {
        // Se for um enum StatusEvento, extrair o valor
        statusValido = String(entity.status);
      }
      
      // Validar se o status está na lista permitida (case-sensitive)
      const statusPermitidos = ['Agendado', 'Confirmado', 'Em andamento', 'Concluído', 'Cancelado'];
      if (statusPermitidos.includes(statusValido)) {
        data.status = statusValido;
      } else {
        // Se não for válido, usar 'Agendado' como fallback e logar o erro
        console.error(`[EventoSupabaseRepository] Status inválido recebido: "${statusValido}" (tipo: ${typeof entity.status}). Valores permitidos: ${statusPermitidos.join(', ')}. Usando "Agendado" como fallback.`);
        data.status = 'Agendado';
      }
    }
    if (entity.valorTotal !== undefined) data.valor_total = entity.valorTotal;
    if (entity.diaFinalPagamento !== undefined) data.dia_final_pagamento = entity.diaFinalPagamento instanceof Date ? entity.diaFinalPagamento.toISOString() : entity.diaFinalPagamento || null;
    if (entity.arquivado !== undefined) data.arquivado = entity.arquivado;
    if (entity.dataArquivamento !== undefined) data.data_arquivamento = entity.dataArquivamento instanceof Date ? entity.dataArquivamento.toISOString() : entity.dataArquivamento || null;
    if (entity.motivoArquivamento !== undefined) data.motivo_arquivamento = entity.motivoArquivamento || null;
    if (entity.googleCalendarEventId !== undefined) data.google_calendar_event_id = entity.googleCalendarEventId || null;
    if (entity.googleCalendarSyncedAt !== undefined) data.google_calendar_synced_at = entity.googleCalendarSyncedAt instanceof Date ? entity.googleCalendarSyncedAt.toISOString() : entity.googleCalendarSyncedAt || null;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao instanceof Date ? entity.dataAtualizacao.toISOString() : entity.dataAtualizacao;
    
    return data;
  }

  // Métodos específicos mantendo a interface original
  async findByClienteId(clienteId: string, userId: string): Promise<Evento[]> {
    return this.query(
      [{ field: 'user_id', operator: '==', value: userId }, { field: 'cliente_id', operator: '==', value: clienteId }],
      { field: 'data_evento', direction: 'asc' }
    );
  }

  async findByStatus(status: string, userId: string): Promise<Evento[]> {
    return this.query(
      [{ field: 'user_id', operator: '==', value: userId }, { field: 'status', operator: '==', value: status }],
      { field: 'data_evento', direction: 'asc' }
    );
  }

  async findByTipoEvento(tipoEvento: string, userId: string): Promise<Evento[]> {
    return this.query(
      [{ field: 'user_id', operator: '==', value: userId }, { field: 'tipo_evento', operator: '==', value: tipoEvento }],
      { field: 'data_evento', direction: 'asc' }
    );
  }

  async findByDataEvento(dataInicio: Date, dataFim: Date, userId: string): Promise<Evento[]> {
    return this.query(
      [
        { field: 'user_id', operator: '==', value: userId },
        { field: 'data_evento', operator: '>=', value: dataInicio.toISOString() },
        { field: 'data_evento', operator: '<=', value: dataFim.toISOString() }
      ],
      { field: 'data_evento', direction: 'asc' }
    );
  }

  async getEventosHoje(userId: string): Promise<Evento[]> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimDoDia = new Date();
    fimDoDia.setHours(23, 59, 59, 999);
    
    return this.findByDataEvento(hoje, fimDoDia, userId);
  }

  async getProximosEventos(userId: string, limit: number = 10): Promise<Evento[]> {
    const hoje = new Date();
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('arquivado', false)
      .gte('data_evento', hoje.toISOString())
      .order('data_evento', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar próximos eventos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async getEventosPorMes(mes: number, ano: number, userId: string): Promise<Evento[]> {
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);
    
    return this.findByDataEvento(inicioMes, fimMes, userId);
  }

  async searchByLocal(local: string, userId: string): Promise<Evento[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .or(`local.ilike.%${local}%,endereco.ilike.%${local}%`);

    if (error) {
      throw new Error(`Erro ao buscar eventos por local: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async getEventosPorPeriodo(inicio: Date, fim: Date, userId: string): Promise<Evento[]> {
    return this.findByDataEvento(inicio, fim, userId);
  }

  async createEvento(evento: Omit<Evento, 'id' | 'dataCadastro' | 'dataAtualizacao'>, userId: string): Promise<Evento> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const eventoWithMeta = {
      ...evento,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    } as Omit<Evento, 'id'>;
    
    const supabaseData = this.convertToSupabase(eventoWithMeta);
    supabaseData.id = id;
    supabaseData.user_id = userId;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar evento: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async updateEvento(id: string, evento: Partial<Evento>, userId: string): Promise<Evento> {
    const supabaseData = this.convertToSupabase(evento);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar evento: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async deleteEvento(id: string, userId: string): Promise<void> {
    await this.updateEvento(id, {
      arquivado: true,
      dataArquivamento: new Date()
    }, userId);
  }

  async desarquivarEvento(id: string, userId: string): Promise<void> {
    await this.updateEvento(id, {
      arquivado: false,
      dataArquivamento: undefined,
      motivoArquivamento: undefined
    }, userId);
  }

  async getArquivados(userId: string): Promise<Evento[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, clientes(*)')
      .eq('user_id', userId)
      .eq('arquivado', true)
      .order('data_evento', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar eventos arquivados: ${error.message}`);
    }

    return (data || []).map(row => {
      const evento = this.convertFromSupabase(row);
      
      // Popular cliente se disponível
      // Type assertion para resolver problema de inferência de tipos do Supabase
      const rowData = row as any;
      if (rowData.clientes) {
        evento.cliente = {
          id: rowData.clientes.id,
          nome: rowData.clientes.nome,
          cpf: rowData.clientes.cpf || '',
          email: rowData.clientes.email || '',
          telefone: rowData.clientes.telefone || '',
          endereco: rowData.clientes.endereco || '',
          cep: rowData.clientes.cep || '',
          instagram: rowData.clientes.instagram,
          canalEntradaId: rowData.clientes.canal_entrada_id,
          arquivado: rowData.clientes.arquivado || false,
          dataArquivamento: rowData.clientes.data_arquivamento ? new Date(rowData.clientes.data_arquivamento) : undefined,
          motivoArquivamento: rowData.clientes.motivo_arquivamento,
          dataCadastro: new Date(rowData.clientes.data_cadastro),
        };
      }
      
      return evento;
    });
  }

  async getAtivos(userId: string): Promise<Evento[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, clientes(*)')
      .eq('user_id', userId)
      .or('arquivado.is.null,arquivado.eq.false')
      .order('data_evento', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar eventos ativos: ${error.message}`);
    }

    return (data || []).map(row => {
      const evento = this.convertFromSupabase(row);
      
      // Popular cliente se disponível
      // Type assertion para resolver problema de inferência de tipos do Supabase
      const rowData = row as any;
      if (rowData.clientes) {
        evento.cliente = {
          id: rowData.clientes.id,
          nome: rowData.clientes.nome,
          cpf: rowData.clientes.cpf || '',
          email: rowData.clientes.email || '',
          telefone: rowData.clientes.telefone || '',
          endereco: rowData.clientes.endereco || '',
          cep: rowData.clientes.cep || '',
          instagram: rowData.clientes.instagram,
          canalEntradaId: rowData.clientes.canal_entrada_id,
          arquivado: rowData.clientes.arquivado || false,
          dataArquivamento: rowData.clientes.data_arquivamento ? new Date(rowData.clientes.data_arquivamento) : undefined,
          motivoArquivamento: rowData.clientes.motivo_arquivamento,
          dataCadastro: new Date(rowData.clientes.data_cadastro),
        };
      }
      
      return evento;
    });
  }

  async getEventoById(id: string, userId: string): Promise<Evento | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, clientes(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar evento: ${error.message}`);
    }

    if (!data) return null;

    const evento = this.convertFromSupabase(data);

    // Popular cliente se disponível
    // Type assertion para resolver problema de inferência de tipos do Supabase
    const dataRow = data as any;
    if (dataRow.clientes) {
      evento.cliente = {
        id: dataRow.clientes.id,
        nome: dataRow.clientes.nome,
        cpf: dataRow.clientes.cpf || '',
        email: dataRow.clientes.email || '',
        telefone: dataRow.clientes.telefone || '',
        endereco: dataRow.clientes.endereco || '',
        cep: dataRow.clientes.cep || '',
        instagram: dataRow.clientes.instagram,
        canalEntradaId: dataRow.clientes.canal_entrada_id,
        arquivado: dataRow.clientes.arquivado || false,
        dataArquivamento: dataRow.clientes.data_arquivamento ? new Date(dataRow.clientes.data_arquivamento) : undefined,
        motivoArquivamento: dataRow.clientes.motivo_arquivamento,
        dataCadastro: new Date(dataRow.clientes.data_cadastro),
      };
    }

    return evento;
  }

  async findAll(userId?: string): Promise<Evento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar eventos');
    }
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('data_evento', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar eventos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findById(id: string, userId?: string): Promise<Evento | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar evento');
    }
    return this.getEventoById(id, userId);
  }
}

