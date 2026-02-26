import { CampoContrato } from '@/types';

export const LABELS_VARIAVEIS: Record<string, string> = {
  nome_cliente: 'Nome do Cliente',
  cpf_cliente: 'CPF do Cliente',
  email_cliente: 'E-mail do Cliente',
  telefone_cliente: 'Telefone do Cliente',
  endereco_cliente: 'Endereço do Cliente',
  cep_cliente: 'CEP do Cliente',
  instagram_cliente: 'Instagram do Cliente',
  id_cliente: 'ID do Cliente',
  nome_contratante: 'Nome do Contratante',
  cpf_contratante: 'CPF do Contratante',
  email_contratante: 'E-mail do Contratante',
  telefone_contratante: 'Telefone do Contratante',
  endereco_contratante: 'Endereço do Contratante',
  cep_contratante: 'CEP do Contratante',
  nome_evento: 'Nome do Evento',
  tipo_evento: 'Tipo do Evento',
  data_evento: 'Data do Evento',
  local_evento: 'Local do Evento',
  endereco_evento: 'Endereço do Evento',
  numero_convidados: 'Número de Convidados',
  valor_total: 'Valor Total',
  valor_total_formatado: 'Valor Total Formatado',
  horario_inicio: 'Horário de Início',
  horario_termino: 'Horário de Término',
  duracao_servico: 'Duração do Serviço',
  observacoes_evento: 'Observações do Evento',
  tipo_servico: 'Tipo de Serviço',
  tipos_servico: 'Tipos de Serviço',
  data_contrato: 'Data do Contrato',
  razao_social: 'Razão Social',
  nome_fantasia: 'Nome Fantasia',
  cnpj: 'CNPJ',
  inscricao_estadual: 'Inscrição Estadual',
  endereco_empresa: 'Endereço da Empresa',
  bairro_empresa: 'Bairro da Empresa',
  cidade_empresa: 'Cidade da Empresa',
  estado_empresa: 'Estado da Empresa',
  cep_empresa: 'CEP da Empresa',
  telefone_empresa: 'Telefone da Empresa',
  email_empresa: 'E-mail da Empresa',
  site_empresa: 'Site da Empresa',
  banco: 'Banco',
  agencia: 'Agência',
  conta: 'Conta',
  tipo_conta: 'Tipo de Conta',
  pix: 'PIX',
  marca_dagua_url: 'Marca d\'agua (Imagem)',
  marca_dagua_tamanho_percentual: 'Tamanho da Marca d\'agua (%)',
  foro_eleito: 'Foro Eleito',
  numero_contrato: 'Número do Contrato',
  hashtag: 'Hashtag',
  numero_impressoes: 'Número de Impressões',
  quantidade_mesas: 'Quantidade de Mesas',
};

const CAMPOS_DATA = new Set(['data_evento', 'data_contrato', 'data_assinatura']);
const CAMPOS_MOEDA = new Set(['valor_total']);
const CAMPOS_NUMERO = new Set(['numero_convidados', 'numero_impressoes', 'quantidade_mesas']);

export function extrairPlaceholdersDoTemplate(template: string): { unicas: string[]; multiplas: string[] } {
  const matchesUnicas = template.match(/\{\{(\w+)\}\}/g) || [];
  const unicas = matchesUnicas.map(m => m.replace(/\{\{|\}\}/g, ''));

  const matchesMultiplas = template.match(/\[(\w+)\]/g) || [];
  const multiplas = matchesMultiplas.map(m => m.replace(/\[|\]/g, ''));

  return { unicas, multiplas };
}

export function inferirTipoCampo(chave: string, isMultipla: boolean): CampoContrato['tipo'] {
  if (isMultipla) return 'textarea';
  if (CAMPOS_DATA.has(chave)) return 'date';
  if (CAMPOS_MOEDA.has(chave)) return 'currency';
  if (CAMPOS_NUMERO.has(chave)) return 'number';
  return 'text';
}

export function gerarLabelVariavel(chave: string): string {
  return LABELS_VARIAVEIS[chave] || chave.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function gerarCamposDoTemplate(template: string): CampoContrato[] {
  const { unicas, multiplas } = extrairPlaceholdersDoTemplate(template);
  const multiplasSet = new Set(multiplas);

  const chavesVistas = new Set<string>();
  const campos: CampoContrato[] = [];
  let ordem = 0;

  for (const chave of [...unicas, ...multiplas]) {
    if (chave.startsWith('#') || chave === 'if') continue;
    if (chavesVistas.has(chave)) continue;
    chavesVistas.add(chave);

    campos.push({
      id: `auto_${chave}`,
      chave,
      label: gerarLabelVariavel(chave),
      tipo: inferirTipoCampo(chave, multiplasSet.has(chave)),
      obrigatorio: false,
      ordem: ordem++,
    });
  }

  return campos;
}
