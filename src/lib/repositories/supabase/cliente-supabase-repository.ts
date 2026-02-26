import { BaseSupabaseRepository } from './base-supabase-repository';
import { Cliente } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class ClienteSupabaseRepository extends BaseSupabaseRepository<Cliente> {
  constructor() {
    super('clientes', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): Cliente {
    return {
      id: row.id,
      nome: row.nome,
      cpf: row.cpf || '',
      email: row.email || '',
      telefone: row.telefone || '',
      endereco: row.endereco || '',
      cep: row.cep || '',
      instagram: row.instagram,
      canalEntradaId: row.canal_entrada_id,
      arquivado: row.arquivado || false,
      dataArquivamento: row.data_arquivamento ? new Date(row.data_arquivamento) : undefined,
      motivoArquivamento: row.motivo_arquivamento,
      dataCadastro: new Date(row.data_cadastro),
    };
  }

  /**
   * Normaliza CPF para garantir que não exceda 14 caracteres
   * Remove caracteres não numéricos, mantém apenas números e formata se necessário
   */
  private normalizarCpf(cpf: string | undefined | null): string | null {
    if (!cpf) return null;
    
    // Remover todos os caracteres não numéricos
    const apenasNumeros = cpf.replace(/\D/g, '');
    
    // Se não tiver números, retornar null
    if (!apenasNumeros) return null;
    
    // Se tiver mais de 11 dígitos, truncar para 11
    const numerosLimitados = apenasNumeros.slice(0, 11);
    
    // Se tiver 11 dígitos, formatar como CPF: XXX.XXX.XXX-XX
    if (numerosLimitados.length === 11) {
      return `${numerosLimitados.slice(0, 3)}.${numerosLimitados.slice(3, 6)}.${numerosLimitados.slice(6, 9)}-${numerosLimitados.slice(9, 11)}`;
    }
    
    // Se tiver menos de 11 dígitos, retornar como está (pode ser um documento incompleto)
    // Mas limitar a 14 caracteres para não exceder o limite do banco
    return numerosLimitados.slice(0, 14);
  }

  /**
   * Normaliza CEP para garantir que não exceda 10 caracteres
   * Remove caracteres não numéricos e formata se necessário
   */
  private normalizarCep(cep: string | undefined | null): string | null {
    if (!cep) return null;
    
    // Remover todos os caracteres não numéricos
    const apenasNumeros = cep.replace(/\D/g, '');
    
    // Se não tiver números, retornar null
    if (!apenasNumeros) return null;
    
    // Se tiver mais de 8 dígitos, truncar para 8
    const numerosLimitados = apenasNumeros.slice(0, 8);
    
    // Se tiver 8 dígitos, formatar como CEP: XXXXX-XXX
    if (numerosLimitados.length === 8) {
      return `${numerosLimitados.slice(0, 5)}-${numerosLimitados.slice(5, 8)}`;
    }
    
    // Se tiver menos de 8 dígitos, retornar como está
    // Mas limitar a 10 caracteres para não exceder o limite do banco
    return numerosLimitados.slice(0, 10);
  }

  protected convertToSupabase(entity: Partial<Cliente>): any {
    const data: any = {};
    
    if (entity.nome !== undefined) data.nome = entity.nome;
    if (entity.cpf !== undefined) data.cpf = this.normalizarCpf(entity.cpf);
    if (entity.email !== undefined) data.email = entity.email || null;
    if (entity.telefone !== undefined) data.telefone = entity.telefone || null;
    if (entity.endereco !== undefined) data.endereco = entity.endereco || null;
    if (entity.cep !== undefined) data.cep = this.normalizarCep(entity.cep);
    if (entity.instagram !== undefined) data.instagram = entity.instagram || null;
    if (entity.canalEntradaId !== undefined) data.canal_entrada_id = entity.canalEntradaId || null;
    if (entity.arquivado !== undefined) data.arquivado = entity.arquivado;
    if (entity.dataArquivamento !== undefined) data.data_arquivamento = entity.dataArquivamento?.toISOString() || null;
    if (entity.motivoArquivamento !== undefined) data.motivo_arquivamento = entity.motivoArquivamento || null;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro.toISOString();
    
    return data;
  }

  // Métodos específicos mantendo a interface original
  async findByEmail(email: string, userId: string): Promise<Cliente | null> {
    if (!email || !email.trim()) {
      return null;
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar cliente por email: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async findByCpf(cpf: string, userId: string): Promise<Cliente | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('cpf', cpf)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar cliente por CPF: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async searchByName(name: string, userId: string): Promise<Cliente[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .ilike('nome', `%${name}%`);

    if (error) {
      throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async getRecentClientes(userId: string, limit: number = 10): Promise<Cliente[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('data_cadastro', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar clientes recentes: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async createCliente(cliente: Omit<Cliente, 'id' | 'dataCadastro'>, userId: string): Promise<Cliente> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const clienteWithMeta = {
      ...cliente,
      dataCadastro: new Date()
    } as Omit<Cliente, 'id'>;
    
    const supabaseData = this.convertToSupabase(clienteWithMeta);
    supabaseData.id = id;
    supabaseData.user_id = userId;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar cliente: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async updateCliente(id: string, cliente: Partial<Cliente>, userId: string): Promise<Cliente> {
    const supabaseData = this.convertToSupabase(cliente);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar cliente: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async deleteCliente(id: string, userId: string): Promise<void> {
    await this.updateCliente(id, {
      arquivado: true,
      dataArquivamento: new Date()
    }, userId);
  }

  async desarquivarCliente(id: string, userId: string): Promise<void> {
    await this.updateCliente(id, {
      arquivado: false,
      dataArquivamento: undefined,
      motivoArquivamento: undefined
    }, userId);
  }

  async getArquivados(userId: string): Promise<Cliente[]> {
    return this.query(
      [{ field: 'user_id', operator: '==', value: userId }, { field: 'arquivado', operator: '==', value: true }],
      { field: 'data_cadastro', direction: 'desc' }
    );
  }

  async getAtivos(userId: string): Promise<Cliente[]> {
    console.log(`[ClienteSupabaseRepository] Buscando clientes ativos para userId: ${userId}`);
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .or('arquivado.is.null,arquivado.eq.false')
      .order('data_cadastro', { ascending: false });

    if (error) {
      console.error(`[ClienteSupabaseRepository] Erro ao buscar clientes ativos:`, error);
      throw new Error(`Erro ao buscar clientes ativos: ${error.message}`);
    }

    console.log(`[ClienteSupabaseRepository] Encontrados ${data?.length || 0} clientes ativos`);
    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async getClienteById(id: string, userId: string): Promise<Cliente | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar cliente: ${error.message}`);
    }

    if (!data) return null;

    const cliente = this.convertFromSupabase(data);

    // Carregar canal de entrada se existir
    if (cliente.canalEntradaId) {
      try {
        const { data: canalData, error: canalError } = await this.supabase
          .from('canais_entrada')
          .select('*')
          .eq('id', cliente.canalEntradaId)
          .eq('user_id', userId)
          .maybeSingle();

        if (canalError && canalError.code !== 'PGRST116') {
          console.error('Erro ao carregar canal de entrada:', canalError);
        } else if (canalData) {
          // Type assertion para resolver problema de inferência de tipos do Supabase
          const canal = canalData as any;
          cliente.canalEntrada = {
            id: canal.id,
            nome: canal.nome,
            descricao: canal.descricao,
            ativo: canal.ativo,
            dataCadastro: new Date(canal.data_cadastro),
          };
        }
      } catch (error) {
        console.error('Erro ao carregar canal de entrada:', error);
      }
    }

    return cliente;
  }

  async findAll(userId?: string): Promise<Cliente[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar clientes');
    }
    
    console.log(`[ClienteSupabaseRepository] Buscando todos os clientes para userId: ${userId}`);
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('data_cadastro', { ascending: false });

    if (error) {
      console.error(`[ClienteSupabaseRepository] Erro ao buscar todos os clientes:`, error);
      throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    console.log(`[ClienteSupabaseRepository] Encontrados ${data?.length || 0} clientes no total`);
    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findById(id: string, userId?: string): Promise<Cliente | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar cliente');
    }
    return this.getClienteById(id, userId);
  }

  async countClientesPorAno(ano: number, userId: string): Promise<number> {
    const inicioAno = new Date(ano, 0, 1);
    const fimAno = new Date(ano, 11, 31, 23, 59, 59, 999);

    const { count, error } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('arquivado', false)
      .gte('data_cadastro', inicioAno.toISOString())
      .lte('data_cadastro', fimAno.toISOString());

    if (error) {
      console.error('Erro ao contar clientes por ano:', error);
      return 0;
    }

    return count || 0;
  }
}

