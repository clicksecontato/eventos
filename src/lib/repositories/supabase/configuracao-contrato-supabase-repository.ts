import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ConfiguracaoContrato } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class ConfiguracaoContratoSupabaseRepository extends BaseSupabaseRepository<ConfiguracaoContrato> {
  constructor() {
    super('configuracao_contrato', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): ConfiguracaoContrato {
    // Função auxiliar para converter data de forma segura
    const parseDate = (dateValue: any): Date => {
      if (!dateValue) return new Date();
      if (dateValue instanceof Date) return dateValue;
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    return {
      id: row.id,
      userId: row.user_id,
      razaoSocial: row.razao_social,
      nomeFantasia: row.nome_fantasia || undefined,
      cnpj: row.cnpj,
      inscricaoEstadual: row.inscricao_estadual || undefined,
      endereco: row.endereco || {},
      contato: row.contato || {},
      dadosBancarios: row.dados_bancarios || undefined,
      marcaDaguaUrl: row.marca_dagua_url || undefined,
      marcaDaguaS3Key: row.marca_dagua_s3_key || undefined,
      marcaDaguaTamanhoPercentual: row.marca_dagua_tamanho_percentual || undefined,
      foro: row.foro || undefined,
      cidade: row.cidade || undefined,
      dataCadastro: parseDate(row.data_cadastro),
      dataAtualizacao: parseDate(row.data_atualizacao),
    };
  }

  protected convertToSupabase(entity: Partial<ConfiguracaoContrato>): any {
    const data: any = {};
    
    if (entity.userId !== undefined) data.user_id = entity.userId;
    if (entity.razaoSocial !== undefined) data.razao_social = entity.razaoSocial;
    if (entity.nomeFantasia !== undefined) data.nome_fantasia = entity.nomeFantasia || null;
    if (entity.cnpj !== undefined) data.cnpj = entity.cnpj;
    if (entity.inscricaoEstadual !== undefined) data.inscricao_estadual = entity.inscricaoEstadual || null;
    // Garantir que endereco e contato sejam sempre objetos (campos obrigatórios NOT NULL)
    if (entity.endereco !== undefined) {
      data.endereco = entity.endereco && typeof entity.endereco === 'object' ? entity.endereco : {};
    }
    if (entity.contato !== undefined) {
      data.contato = entity.contato && typeof entity.contato === 'object' ? entity.contato : {};
    }
    if (entity.dadosBancarios !== undefined) data.dados_bancarios = entity.dadosBancarios || null;
    if (entity.marcaDaguaUrl !== undefined) data.marca_dagua_url = entity.marcaDaguaUrl || null;
    if (entity.marcaDaguaS3Key !== undefined) data.marca_dagua_s3_key = entity.marcaDaguaS3Key || null;
    if (entity.marcaDaguaTamanhoPercentual !== undefined) data.marca_dagua_tamanho_percentual = entity.marcaDaguaTamanhoPercentual || null;
    if (entity.foro !== undefined) data.foro = entity.foro || null;
    if (entity.cidade !== undefined) data.cidade = entity.cidade || null;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao instanceof Date ? entity.dataAtualizacao.toISOString() : entity.dataAtualizacao;
    
    return data;
  }

  async findByUserId(userId: string): Promise<ConfiguracaoContrato | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar configuração de contrato: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async createOrUpdate(userId: string, data: Partial<ConfiguracaoContrato>): Promise<ConfiguracaoContrato> {
    const existente = await this.findByUserId(userId);
    
    // Garantir que endereco e contato sejam objetos válidos (campos obrigatórios no schema)
    const dadosCompletos: Partial<ConfiguracaoContrato> = {
      ...data,
      endereco: data.endereco || (existente?.endereco || {
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: ''
      }),
      contato: data.contato || (existente?.contato || {
        telefone: '',
        email: '',
        site: ''
      })
    };
    
    if (existente) {
      return await this.update(existente.id, {
        ...dadosCompletos,
        dataAtualizacao: new Date()
      });
    } else {
      return await this.create({
        userId,
        ...dadosCompletos,
        dataCadastro: new Date(),
        dataAtualizacao: new Date()
      } as Omit<ConfiguracaoContrato, 'id'>);
    }
  }

  async create(config: Omit<ConfiguracaoContrato, 'id'>): Promise<ConfiguracaoContrato> {
    const id = generateUUID();

    const configWithMeta = {
      ...config,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    } as Omit<ConfiguracaoContrato, 'id'>;

    const supabaseData = this.convertToSupabase(configWithMeta);
    supabaseData.id = id;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar configuração de contrato: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async update(id: string, config: Partial<ConfiguracaoContrato>): Promise<ConfiguracaoContrato> {
    // Buscar configuração existente para preservar campos não enviados
    const existente = await this.findById(id);
    if (!existente) {
      throw new Error('Configuração não encontrada');
    }

    // Mesclar dados existentes com novos dados
    const dadosCompletos: Partial<ConfiguracaoContrato> = {
      ...existente,
      ...config,
      // Garantir que endereco e contato sejam sempre objetos válidos
      endereco: config.endereco || existente.endereco || {},
      contato: config.contato || existente.contato || {},
      dataAtualizacao: new Date()
    };

    const supabaseData = this.convertToSupabase(dadosCompletos);
    // Sempre atualizar data_atualizacao
    supabaseData.data_atualizacao = new Date().toISOString();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar configuração de contrato: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async getCamposFixos(userId: string): Promise<Record<string, any>> {
    const config = await this.findByUserId(userId);
    if (!config) {
      return {};
    }

    return {
      razao_social: config.razaoSocial,
      nome_fantasia: config.nomeFantasia || config.razaoSocial,
      cnpj: config.cnpj,
      inscricao_estadual: config.inscricaoEstadual || '',
      endereco_empresa: `${config.endereco.logradouro || ''}, ${config.endereco.numero || ''}${config.endereco.complemento ? ' - ' + config.endereco.complemento : ''}`,
      bairro_empresa: config.endereco.bairro || '',
      cidade_empresa: config.cidade || config.endereco.cidade || '',
      estado_empresa: config.endereco.estado || '',
      cep_empresa: config.endereco.cep || '',
      telefone_empresa: config.contato.telefone || '',
      email_empresa: config.contato.email || '',
      site_empresa: config.contato.site || '',
      banco: config.dadosBancarios?.banco || '',
      agencia: config.dadosBancarios?.agencia || '',
      conta: config.dadosBancarios?.conta || '',
      tipo_conta: config.dadosBancarios?.tipo || '',
      pix: config.dadosBancarios?.pix || '',
      marca_dagua_url: config.marcaDaguaUrl || '',
      marca_dagua_tamanho_percentual: config.marcaDaguaTamanhoPercentual || 70,
      foro_eleito: config.foro || ''
    };
  }
}
