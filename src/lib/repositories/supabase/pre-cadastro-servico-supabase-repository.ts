import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { PreCadastroServico } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class PreCadastroServicoSupabaseRepository extends BaseSupabaseRepository<PreCadastroServico> {
  constructor() {
    super('pre_cadastros_servicos', undefined, true); // Usar service role para bypassar RLS (mas também precisa de políticas públicas)
  }

  protected convertFromSupabase(row: any): PreCadastroServico {
    return {
      id: row.id,
      userId: row.user_id,
      preCadastroId: row.pre_cadastro_id,
      tipoServicoId: row.tipo_servico_id,
      observacoes: row.observacoes,
      removido: row.removido || false,
      dataRemocao: row.data_remocao ? new Date(row.data_remocao) : undefined,
      motivoRemocao: row.motivo_remocao,
      dataCadastro: new Date(row.data_cadastro),
      // Relacionamentos serão carregados separadamente
      tipoServico: {} as any,
    };
  }

  protected convertToSupabase(entity: Partial<PreCadastroServico>): any {
    const data: any = {};
    
    if (entity.userId !== undefined) data.user_id = entity.userId;
    if (entity.preCadastroId !== undefined) data.pre_cadastro_id = entity.preCadastroId;
    if (entity.tipoServicoId !== undefined) data.tipo_servico_id = entity.tipoServicoId;
    if (entity.observacoes !== undefined) data.observacoes = entity.observacoes || null;
    if (entity.removido !== undefined) data.removido = entity.removido;
    if (entity.dataRemocao !== undefined) data.data_remocao = entity.dataRemocao instanceof Date ? entity.dataRemocao.toISOString() : entity.dataRemocao || null;
    if (entity.motivoRemocao !== undefined) data.motivo_remocao = entity.motivoRemocao || null;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    
    return data;
  }

  /**
   * Busca serviços por pré-cadastro ID
   */
  async findByPreCadastroId(userId: string, preCadastroId: string): Promise<PreCadastroServico[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, tipo_servicos(*)')
      .eq('user_id', userId)
      .eq('pre_cadastro_id', preCadastroId)
      .eq('removido', false)
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar serviços: ${error.message}`);
    }

    return (data || []).map(row => {
      const servico = this.convertFromSupabase(row);
      
      // Popular tipo de serviço se disponível
      const rowData = row as any;
      if (rowData.tipo_servicos) {
        servico.tipoServico = {
          id: rowData.tipo_servicos.id,
          nome: rowData.tipo_servicos.nome,
          descricao: rowData.tipo_servicos.descricao,
          ativo: rowData.tipo_servicos.ativo,
          dataCadastro: new Date(rowData.tipo_servicos.data_cadastro),
        };
      }
      
      return servico;
    });
  }

  /**
   * Busca serviços por pré-cadastro ID (público, sem userId - para link público)
   */
  async findByPreCadastroIdPublic(preCadastroId: string): Promise<PreCadastroServico[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, tipo_servicos(*)')
      .eq('pre_cadastro_id', preCadastroId)
      .eq('removido', false)
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar serviços: ${error.message}`);
    }

    return (data || []).map(row => {
      const servico = this.convertFromSupabase(row);
      
      // Popular tipo de serviço se disponível
      const rowData = row as any;
      if (rowData.tipo_servicos) {
        servico.tipoServico = {
          id: rowData.tipo_servicos.id,
          nome: rowData.tipo_servicos.nome,
          descricao: rowData.tipo_servicos.descricao,
          ativo: rowData.tipo_servicos.ativo,
          dataCadastro: new Date(rowData.tipo_servicos.data_cadastro),
        };
      }
      
      return servico;
    });
  }

  /**
   * Cria múltiplos serviços de uma vez
   */
  async createMultiplos(userId: string, preCadastroId: string, servicos: Omit<PreCadastroServico, 'id' | 'userId' | 'preCadastroId' | 'dataCadastro'>[]): Promise<PreCadastroServico[]> {
    if (servicos.length === 0) return [];

    const agora = new Date();
    const servicosParaInserir = servicos.map(servico => {
      const id = generateUUID();
      const servicoCompleto: Omit<PreCadastroServico, 'id'> = {
        ...servico,
        userId,
        preCadastroId,
        dataCadastro: agora,
      };

      const supabaseData = this.convertToSupabase(servicoCompleto);
      supabaseData.id = id;
      return supabaseData;
    });

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(servicosParaInserir)
      .select('*, tipo_servicos(*)');

    if (error) {
      throw new Error(`Erro ao criar serviços: ${error.message}`);
    }

    return (data || []).map(row => {
      const servico = this.convertFromSupabase(row);
      
      const rowData = row as any;
      if (rowData.tipo_servicos) {
        servico.tipoServico = {
          id: rowData.tipo_servicos.id,
          nome: rowData.tipo_servicos.nome,
          descricao: rowData.tipo_servicos.descricao,
          ativo: rowData.tipo_servicos.ativo,
          dataCadastro: new Date(rowData.tipo_servicos.data_cadastro),
        };
      }
      
      return servico;
    });
  }

  /**
   * Deleta todos os serviços de um pré-cadastro
   */
  async deleteByPreCadastroId(userId: string, preCadastroId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('user_id', userId)
      .eq('pre_cadastro_id', preCadastroId);

    if (error) {
      throw new Error(`Erro ao deletar serviços: ${error.message}`);
    }
  }

  /**
   * Cria um serviço
   */
  async createServico(userId: string, preCadastroId: string, servico: Omit<PreCadastroServico, 'id' | 'userId' | 'preCadastroId' | 'dataCadastro'>): Promise<PreCadastroServico> {
    const id = generateUUID();

    const servicoCompleto: Omit<PreCadastroServico, 'id'> = {
      ...servico,
      userId,
      preCadastroId,
      dataCadastro: new Date(),
    };

    const supabaseData = this.convertToSupabase(servicoCompleto);
    supabaseData.id = id;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select('*, tipo_servicos(*)')
      .single();

    if (error) {
      throw new Error(`Erro ao criar serviço: ${error.message}`);
    }

    const servicoCriado = this.convertFromSupabase(data);
    
    const dataRow = data as any;
    if (dataRow.tipo_servicos) {
      servicoCriado.tipoServico = {
        id: dataRow.tipo_servicos.id,
        nome: dataRow.tipo_servicos.nome,
        descricao: dataRow.tipo_servicos.descricao,
        ativo: dataRow.tipo_servicos.ativo,
        dataCadastro: new Date(dataRow.tipo_servicos.data_cadastro),
      };
    }

    return servicoCriado;
  }
}
