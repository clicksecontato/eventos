import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { PreCadastroServico } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { getEmpresaIdPadrao } from '@/lib/tenant-config';

export class PreCadastroServicoSupabaseRepository extends BaseSupabaseRepository<PreCadastroServico> {
  constructor() {
    super('pre_cadastros_servicos', undefined, true); // Usar service role para bypassar RLS (mas também precisa de políticas públicas)
  }

  protected convertFromSupabase(row: any): PreCadastroServico {
    return {
      id: row.id,
      userId: row.user_id,
      preCadastroId: row.pre_cadastro_id,
      tipoServicoId: row.servico_id || row.tipo_servico_id,
      servicoId: row.servico_id || row.tipo_servico_id,
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
    if (entity.tipoServicoId !== undefined) {
      data.servico_id = entity.tipoServicoId;
      data.tipo_servico_id = entity.tipoServicoId; // compatibilidade legada
    }
    if ((entity as any).servicoId !== undefined) {
      data.servico_id = (entity as any).servicoId;
      data.tipo_servico_id = (entity as any).servicoId; // compatibilidade legada
    }
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
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, servicos!pre_cadastros_servicos_servico_id_fkey(*)')
      .eq('empresa_id', empresaId)
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
      if (rowData.servicos) {
        servico.tipoServico = {
          id: rowData.servicos.id,
          nome: rowData.servicos.nome,
          descricao: rowData.servicos.descricao,
          ativo: rowData.servicos.ativo,
          dataCadastro: new Date(rowData.servicos.data_cadastro),
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
      .select('*, servicos!pre_cadastros_servicos_servico_id_fkey(*)')
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
      if (rowData.servicos) {
        servico.tipoServico = {
          id: rowData.servicos.id,
          nome: rowData.servicos.nome,
          descricao: rowData.servicos.descricao,
          ativo: rowData.servicos.ativo,
          dataCadastro: new Date(rowData.servicos.data_cadastro),
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
      supabaseData.empresa_id = getEmpresaIdPadrao();
      return supabaseData;
    });

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(servicosParaInserir)
      .select('*, servicos!pre_cadastros_servicos_servico_id_fkey(*)');

    if (error) {
      throw new Error(`Erro ao criar serviços: ${error.message}`);
    }

    return (data || []).map(row => {
      const servico = this.convertFromSupabase(row);
      
      const rowData = row as any;
      if (rowData.servicos) {
        servico.tipoServico = {
          id: rowData.servicos.id,
          nome: rowData.servicos.nome,
          descricao: rowData.servicos.descricao,
          ativo: rowData.servicos.ativo,
          dataCadastro: new Date(rowData.servicos.data_cadastro),
        };
      }
      
      return servico;
    });
  }

  /**
   * Deleta todos os serviços de um pré-cadastro
   */
  async deleteByPreCadastroId(userId: string, preCadastroId: string): Promise<void> {
    const empresaId = getEmpresaIdPadrao();
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('empresa_id', empresaId)
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
    supabaseData.empresa_id = getEmpresaIdPadrao();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select('*, servicos!pre_cadastros_servicos_servico_id_fkey(*)')
      .single();

    if (error) {
      throw new Error(`Erro ao criar serviço: ${error.message}`);
    }

    const servicoCriado = this.convertFromSupabase(data);
    
    const dataRow = data as any;
    if (dataRow.servicos) {
      servicoCriado.tipoServico = {
        id: dataRow.servicos.id,
        nome: dataRow.servicos.nome,
        descricao: dataRow.servicos.descricao,
        ativo: dataRow.servicos.ativo,
        dataCadastro: new Date(dataRow.servicos.data_cadastro),
      };
    }

    return servicoCriado;
  }
}
