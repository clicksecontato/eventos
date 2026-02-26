import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { PreCadastroEvento, StatusPreCadastro } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { dateToLocalMidnight, dateToUTCMidnight } from '@/lib/utils/date-helpers';

export class PreCadastroEventoSupabaseRepository extends BaseSupabaseRepository<PreCadastroEvento> {
  constructor() {
    super('pre_cadastros_eventos', undefined, true); // Usar service role para bypassar RLS (mas também precisa de políticas públicas)
  }

  protected convertFromSupabase(row: any): PreCadastroEvento {
    return {
      id: row.id,
      userId: row.user_id,
      
      // Dados do Cliente
      clienteNome: row.cliente_nome,
      clienteEmail: row.cliente_email,
      clienteTelefone: row.cliente_telefone,
      clienteCpf: row.cliente_cpf,
      clienteEndereco: row.cliente_endereco,
      clienteCep: row.cliente_cep,
      clienteInstagram: row.cliente_instagram,
      clienteCanalEntradaId: row.cliente_canal_entrada_id,
      
      // Dados do Evento
      nomeEvento: row.nome_evento,
      // Converter data do banco (UTC) para timezone local
      // O Supabase retorna como string ISO (ex: "2026-01-31T00:00:00.000Z")
      // Precisamos extrair o ano, mês e dia UTC e criar uma data local
      dataEvento: row.data_evento ? (() => {
        let utcDate: Date;
        if (row.data_evento instanceof Date) {
          utcDate = row.data_evento;
        } else if (typeof row.data_evento === 'string') {
          // Se for string, criar Date a partir dela
          utcDate = new Date(row.data_evento);
        } else {
          return undefined;
        }
        // Converter UTC para timezone local preservando o dia
        return dateToLocalMidnight(utcDate);
      })() : undefined,
      local: row.local,
      endereco: row.endereco,
      tipoEvento: row.tipo_evento,
      tipoEventoId: row.tipo_evento_id,
      contratante: row.contratante,
      numeroConvidados: row.numero_convidados || 0,
      quantidadeMesas: row.quantidade_mesas,
      hashtag: row.hashtag,
      horarioInicio: row.horario_inicio,
      horarioTermino: row.horario_termino,
      cerimonialista: row.cerimonialista as { nome?: string; telefone?: string } | undefined,
      observacoes: row.observacoes,
      
      // Metadados
      status: row.status as StatusPreCadastro,
      dataExpiracao: new Date(row.data_expiracao),
      dataPreenchimento: row.data_preenchimento ? new Date(row.data_preenchimento) : undefined,
      dataConversao: row.data_conversao ? new Date(row.data_conversao) : undefined,
      eventoId: row.evento_id,
      clienteId: row.cliente_id,
      
      // Timestamps
      dataCadastro: new Date(row.data_cadastro),
      dataAtualizacao: new Date(row.data_atualizacao),
      
      // Relacionamentos (serão carregados separadamente)
      servicos: [],
    };
  }

  protected convertToSupabase(entity: Partial<PreCadastroEvento>): any {
    const data: any = {};
    
    if (entity.userId !== undefined) data.user_id = entity.userId;
    
    // Dados do Cliente
    if (entity.clienteNome !== undefined) data.cliente_nome = entity.clienteNome || null;
    if (entity.clienteEmail !== undefined) data.cliente_email = entity.clienteEmail || null;
    if (entity.clienteTelefone !== undefined) data.cliente_telefone = entity.clienteTelefone || null;
    if (entity.clienteCpf !== undefined) data.cliente_cpf = entity.clienteCpf || null;
    if (entity.clienteEndereco !== undefined) data.cliente_endereco = entity.clienteEndereco || null;
    if (entity.clienteCep !== undefined) data.cliente_cep = entity.clienteCep || null;
    if (entity.clienteInstagram !== undefined) data.cliente_instagram = entity.clienteInstagram || null;
    if (entity.clienteCanalEntradaId !== undefined) data.cliente_canal_entrada_id = entity.clienteCanalEntradaId || null;
    
    // Dados do Evento
    if (entity.nomeEvento !== undefined) data.nome_evento = entity.nomeEvento || null;
    // Salvar data usando toISOString() diretamente (igual ao formulário de eventos)
    // Isso mantém consistência: parseLocalDate cria data local, toISOString() converte para UTC
    // Exemplo: 2026-01-31T00:00:00-03:00 → 2026-01-31T03:00:00Z
    if (entity.dataEvento !== undefined) {
      if (entity.dataEvento instanceof Date) {
        data.data_evento = entity.dataEvento.toISOString();
      } else {
        data.data_evento = entity.dataEvento || null;
      }
    }
    if (entity.local !== undefined) data.local = entity.local || null;
    if (entity.endereco !== undefined) data.endereco = entity.endereco || null;
    if (entity.tipoEvento !== undefined) data.tipo_evento = entity.tipoEvento || null;
    if (entity.tipoEventoId !== undefined) data.tipo_evento_id = entity.tipoEventoId || null;
    if (entity.contratante !== undefined) data.contratante = entity.contratante || null;
    if (entity.numeroConvidados !== undefined) data.numero_convidados = entity.numeroConvidados || 0;
    if (entity.quantidadeMesas !== undefined) data.quantidade_mesas = entity.quantidadeMesas || null;
    if (entity.hashtag !== undefined) data.hashtag = entity.hashtag || null;
    if (entity.horarioInicio !== undefined) data.horario_inicio = entity.horarioInicio || null;
    if (entity.horarioTermino !== undefined) data.horario_termino = entity.horarioTermino || null;
    if (entity.cerimonialista !== undefined) data.cerimonialista = entity.cerimonialista || null;
    if (entity.observacoes !== undefined) data.observacoes = entity.observacoes || null;
    
    // Metadados
    if (entity.status !== undefined) {
      const statusPermitidos = ['pendente', 'preenchido', 'convertido', 'expirado', 'ignorado'];
      const statusValido = String(entity.status);
      if (statusPermitidos.includes(statusValido)) {
        data.status = statusValido;
      } else {
        console.error(`[PreCadastroEventoSupabaseRepository] Status inválido: "${statusValido}". Usando "pendente" como fallback.`);
        data.status = 'pendente';
      }
    }
    if (entity.dataExpiracao !== undefined) data.data_expiracao = entity.dataExpiracao instanceof Date ? entity.dataExpiracao.toISOString() : entity.dataExpiracao;
    if (entity.dataPreenchimento !== undefined) data.data_preenchimento = entity.dataPreenchimento instanceof Date ? entity.dataPreenchimento.toISOString() : entity.dataPreenchimento || null;
    if (entity.dataConversao !== undefined) data.data_conversao = entity.dataConversao instanceof Date ? entity.dataConversao.toISOString() : entity.dataConversao || null;
    if (entity.eventoId !== undefined) data.evento_id = entity.eventoId || null;
    if (entity.clienteId !== undefined) data.cliente_id = entity.clienteId || null;
    
    // Timestamps
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao instanceof Date ? entity.dataAtualizacao.toISOString() : entity.dataAtualizacao;
    
    return data;
  }

  /**
   * Busca pré-cadastro por ID (público, sem userId - para link público)
   * Valida expiração automaticamente
   */
  async findByIdPublic(id: string): Promise<PreCadastroEvento | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar pré-cadastro: ${error.message}`);
    }

    if (!data) return null;

    const preCadastro = this.convertFromSupabase(data);
    
    // Validar expiração e atualizar status se necessário
    if (new Date(preCadastro.dataExpiracao) < new Date() && 
        (preCadastro.status === StatusPreCadastro.PENDENTE || preCadastro.status === StatusPreCadastro.PREENCHIDO)) {
      // Atualizar status para expirado
      await this.updatePreCadastro(id, { status: StatusPreCadastro.EXPIRADO }, preCadastro.userId);
      preCadastro.status = StatusPreCadastro.EXPIRADO;
    }

    return preCadastro;
  }

  /**
   * Busca todos os pré-cadastros do usuário com filtros opcionais
   */
  async findAll(userId: string, filtros?: { status?: StatusPreCadastro }): Promise<PreCadastroEvento[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);

    if (filtros?.status) {
      query = query.eq('status', filtros.status);
    }

    query = query.order('data_cadastro', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar pré-cadastros: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  /**
   * Conta pré-cadastros por status
   */
  async contarPorStatus(userId: string): Promise<Record<StatusPreCadastro, number>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('status')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao contar pré-cadastros: ${error.message}`);
    }

    const contadores: Record<StatusPreCadastro, number> = {
      [StatusPreCadastro.PENDENTE]: 0,
      [StatusPreCadastro.PREENCHIDO]: 0,
      [StatusPreCadastro.CONVERTIDO]: 0,
      [StatusPreCadastro.EXPIRADO]: 0,
      [StatusPreCadastro.IGNORADO]: 0,
    };

    // Fazer type assertion segura através de unknown
    const rows = (data || []) as unknown as Array<{ status: string }>;
    
    rows.forEach(row => {
      const statusStr = String(row?.status || '');
      // Verificar se o status é um valor válido do enum
      if (statusStr === StatusPreCadastro.PENDENTE || 
          statusStr === StatusPreCadastro.PREENCHIDO || 
          statusStr === StatusPreCadastro.CONVERTIDO || 
          statusStr === StatusPreCadastro.EXPIRADO || 
          statusStr === StatusPreCadastro.IGNORADO) {
        const status = statusStr as StatusPreCadastro;
        if (status in contadores) {
          contadores[status]++;
        }
      }
    });

    return contadores;
  }

  /**
   * Verifica se pré-cadastro está expirado
   */
  async verificarExpiracao(id: string): Promise<boolean> {
    const preCadastro = await this.findByIdPublic(id);
    if (!preCadastro) return false;
    
    return new Date(preCadastro.dataExpiracao) < new Date();
  }

  /**
   * Atualiza status de pré-cadastros expirados
   */
  async atualizarExpirados(userId: string): Promise<number> {
    const agora = new Date().toISOString();
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ 
        status: StatusPreCadastro.EXPIRADO,
        data_atualizacao: agora
      })
      .eq('user_id', userId)
      .in('status', [StatusPreCadastro.PENDENTE, StatusPreCadastro.PREENCHIDO])
      .lt('data_expiracao', agora)
      .select('id');

    if (error) {
      throw new Error(`Erro ao atualizar pré-cadastros expirados: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Cria um novo pré-cadastro com expiração de 7 dias
   */
  async createComExpiracao(userId: string, nomeEvento: string): Promise<PreCadastroEvento> {
    const id = generateUUID();
    const agora = new Date();
    const dataExpiracao = new Date(agora);
    dataExpiracao.setDate(dataExpiracao.getDate() + 7); // 7 dias

    const preCadastro: Omit<PreCadastroEvento, 'id'> = {
      userId,
      nomeEvento: nomeEvento.trim(),
      status: StatusPreCadastro.PENDENTE,
      dataExpiracao,
      dataCadastro: agora,
      dataAtualizacao: agora,
      servicos: [],
    };

    const supabaseData = this.convertToSupabase(preCadastro);
    supabaseData.id = id;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar pré-cadastro: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  /**
   * Renova expiração adicionando mais 7 dias
   */
  async renovarExpiracao(id: string, userId: string): Promise<PreCadastroEvento> {
    const preCadastro = await this.findById(id, userId);
    if (!preCadastro) {
      throw new Error('Pré-cadastro não encontrado');
    }

    // Se já expirado, renova a partir de agora
    // Se não expirado, adiciona 7 dias à data atual de expiração
    const agora = new Date();
    const dataExpiracaoAtual = new Date(preCadastro.dataExpiracao);
    let novaDataExpiracao: Date;

    if (dataExpiracaoAtual < agora) {
      // Já expirado, renovar a partir de agora
      novaDataExpiracao = new Date(agora);
      novaDataExpiracao.setDate(novaDataExpiracao.getDate() + 7);
    } else {
      // Ainda válido, adicionar 7 dias à data atual
      novaDataExpiracao = new Date(dataExpiracaoAtual);
      novaDataExpiracao.setDate(novaDataExpiracao.getDate() + 7);
    }

    // Se estava expirado, voltar para o status anterior (pendente ou preenchido)
    let novoStatus = preCadastro.status;
    if (preCadastro.status === StatusPreCadastro.EXPIRADO) {
      // Tentar determinar o status anterior
      if (preCadastro.dataPreenchimento) {
        novoStatus = StatusPreCadastro.PREENCHIDO;
      } else {
        novoStatus = StatusPreCadastro.PENDENTE;
      }
    }

    return this.updatePreCadastro(id, {
      dataExpiracao: novaDataExpiracao,
      status: novoStatus,
      dataAtualizacao: agora,
    }, userId);
  }

  /**
   * Busca pré-cadastro por ID com validação de userId
   */
  async findById(id: string, userId: string): Promise<PreCadastroEvento | null> {
    return super.findById(id, userId);
  }

  /**
   * Atualiza pré-cadastro (método específico com userId)
   */
  async updatePreCadastro(id: string, entity: Partial<PreCadastroEvento>, userId: string): Promise<PreCadastroEvento> {
    entity.dataAtualizacao = new Date();
    
    const supabaseData = this.convertToSupabase(entity);
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar pré-cadastro: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  /**
   * Atualiza pré-cadastro (implementação do método base)
   */
  async update(id: string, entity: Partial<PreCadastroEvento>): Promise<PreCadastroEvento> {
    entity.dataAtualizacao = new Date();
    return super.update(id, entity);
  }

  /**
   * Deleta pré-cadastro com validação de userId
   */
  async deletePreCadastro(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao deletar pré-cadastro: ${error.message}`);
    }
  }
}
