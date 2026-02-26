import { SubcollectionRepository } from './subcollection-repository';
import { ConfiguracaoContrato } from '@/types';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { query, limit, getDocs } from 'firebase/firestore';

export class ConfiguracaoContratoRepository extends SubcollectionRepository<ConfiguracaoContrato> {
  constructor() {
    super(COLLECTIONS.USERS, COLLECTIONS.CONFIGURACAO_CONTRATO);
  }

  async findByUserId(userId: string): Promise<ConfiguracaoContrato | null> {
    try {
      const collectionRef = this.getSubcollectionRef(userId);
      const q = query(collectionRef, limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return this.convertFirestoreData(doc.data(), doc.id);
    } catch (error) {
      console.error('Erro ao buscar configuração de contrato:', error);
      return null;
    }
  }

  async createOrUpdate(userId: string, data: Partial<ConfiguracaoContrato>): Promise<ConfiguracaoContrato> {
    const existente = await this.findByUserId(userId);
    
    if (existente) {
      return await this.update(existente.id, {
        ...data,
        dataAtualizacao: new Date()
      }, userId);
    } else {
      return await this.create({
        userId,
        ...data,
        dataCadastro: new Date(),
        dataAtualizacao: new Date()
      } as Omit<ConfiguracaoContrato, 'id'>, userId);
    }
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
      endereco_empresa: `${config.endereco.logradouro}, ${config.endereco.numero}${config.endereco.complemento ? ' - ' + config.endereco.complemento : ''}`,
      bairro_empresa: config.endereco.bairro,
      cidade_empresa: config.cidade || config.endereco.cidade,
      estado_empresa: config.endereco.estado,
      cep_empresa: config.endereco.cep,
      telefone_empresa: config.contato.telefone,
      email_empresa: config.contato.email,
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

