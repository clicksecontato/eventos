import { BaseSupabaseRepository } from './base-supabase-repository';
import { AgendamentoProfissional } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { getEmpresaIdPadrao } from '@/lib/tenant-config';

export class AgendamentoProfissionalSupabaseRepository extends BaseSupabaseRepository<AgendamentoProfissional> {
  constructor() {
    super('agendamento_profissionais', undefined, true);
  }

  protected convertFromSupabase(row: any): AgendamentoProfissional {
    return {
      id: row.id,
      userId: row.user_id,
      empresaId: row.empresa_id,
      nome: row.nome,
      especialidade: row.especialidade || undefined,
      observacoes: row.observacoes || undefined,
      ativo: row.ativo,
      dataCadastro: new Date(row.data_cadastro),
      dataAtualizacao: new Date(row.data_atualizacao)
    };
  }

  protected convertToSupabase(entity: Partial<AgendamentoProfissional>): any {
    const data: any = {};
    if (entity.userId !== undefined) data.user_id = entity.userId;
    if (entity.empresaId !== undefined) data.empresa_id = entity.empresaId;
    if (entity.nome !== undefined) data.nome = entity.nome;
    if (entity.especialidade !== undefined) data.especialidade = entity.especialidade || null;
    if (entity.observacoes !== undefined) data.observacoes = entity.observacoes || null;
    if (entity.ativo !== undefined) data.ativo = entity.ativo;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro.toISOString();
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao.toISOString();
    return data;
  }

  async getAtivos(userId: string): Promise<AgendamentoProfissional[]> {
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar profissionais ativos: ${error.message}`);
    }

    return (data || []).map((row) => this.convertFromSupabase(row));
  }

  async findAll(userId?: string): Promise<AgendamentoProfissional[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar profissionais');
    }

    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar profissionais: ${error.message}`);
    }

    return (data || []).map((row) => this.convertFromSupabase(row));
  }

  async findById(id: string, userId?: string): Promise<AgendamentoProfissional | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar profissional');
    }

    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar profissional: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async createProfissional(
    userId: string,
    payload: Omit<AgendamentoProfissional, 'id' | 'empresaId' | 'userId' | 'dataCadastro' | 'dataAtualizacao'>
  ): Promise<AgendamentoProfissional> {
    const agora = new Date();
    const id = generateUUID();
    const supabaseData = this.convertToSupabase({
      ...payload,
      userId,
      empresaId: getEmpresaIdPadrao(),
      dataCadastro: agora,
      dataAtualizacao: agora
    } as AgendamentoProfissional);
    supabaseData.id = id;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao criar profissional: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async updateProfissional(
    id: string,
    userId: string,
    payload: Partial<Pick<AgendamentoProfissional, 'nome' | 'especialidade' | 'observacoes' | 'ativo'>>
  ): Promise<AgendamentoProfissional> {
    const empresaId = getEmpresaIdPadrao();
    const supabaseData = this.convertToSupabase({
      ...payload,
      dataAtualizacao: new Date()
    });

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar profissional: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }
}
