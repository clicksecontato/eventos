/**
 * Utilitários de formatação para variáveis de contrato.
 * Todas as funções são idempotentes: se o valor já estiver formatado, retornam sem alterar.
 */

/**
 * Formata CPF: 33762021848 → 337.620.218-48
 * Se já estiver formatado ou for inválido, retorna sem alterar.
 */
export function formatarCPF(valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return '';
  const str = String(valor);

  // Se já contém pontos ou traço, provavelmente já está formatado
  if (/[.\-/]/.test(str)) return str;

  const numeros = str.replace(/\D/g, '');
  if (numeros.length !== 11) return str;

  return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`;
}

/**
 * Formata CNPJ: 12345678000190 → 12.345.678/0001-90
 * Se já estiver formatado ou for inválido, retorna sem alterar.
 */
export function formatarCNPJ(valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return '';
  const str = String(valor);

  if (/[.\-/]/.test(str)) return str;

  const numeros = str.replace(/\D/g, '');
  if (numeros.length !== 14) return str;

  return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12, 14)}`;
}

/**
 * Formata CEP: 01310100 → 01310-100
 * Se já estiver formatado ou for inválido, retorna sem alterar.
 */
export function formatarCEP(valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return '';
  const str = String(valor);

  if (str.includes('-')) return str;

  const numeros = str.replace(/\D/g, '');
  if (numeros.length !== 8) return str;

  return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
}

/**
 * Formata telefone brasileiro:
 * - 11 dígitos (celular): 11999887766 → (11) 99988-7766
 * - 10 dígitos (fixo):    1133445566  → (11) 3344-5566
 * Se já estiver formatado ou for inválido, retorna sem alterar.
 */
export function formatarTelefone(valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return '';
  const str = String(valor);

  // Se já contém parênteses, provavelmente já está formatado
  if (str.includes('(')) return str;

  const numeros = str.replace(/\D/g, '');

  if (numeros.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  }

  if (numeros.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6, 10)}`;
  }

  // Formato não reconhecido, retorna como está
  return str;
}

/**
 * Formata valor monetário em Real brasileiro:
 * - 1500    → R$ 1.500,00
 * - 1500.5  → R$ 1.500,50
 * - "1500"  → R$ 1.500,00
 * Se o valor já contiver "R$", retorna sem alterar.
 */
export function formatarMoeda(valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return '';
  const str = String(valor);

  // Se já contém R$, provavelmente já está formatado
  if (str.includes('R$')) return str;

  const numero = typeof valor === 'number' ? valor : parseFloat(str.replace(',', '.'));
  if (isNaN(numero)) return str;

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Mapa de campos que possuem formatação automática.
 * Chave: nome da variável do template.
 * Valor: função de formatação correspondente.
 */
export const FORMATADORES_VARIAVEIS: Record<string, (valor: unknown) => string> = {
  // CPF
  cpf_cliente: formatarCPF,
  cpf_contratante: formatarCPF,

  // CNPJ
  cnpj: formatarCNPJ,

  // CEP
  cep_empresa: formatarCEP,
  cep_cliente: formatarCEP,
  cep_contratante: formatarCEP,

  // Telefone
  telefone_empresa: formatarTelefone,
  telefone_cliente: formatarTelefone,
  telefone_contratante: formatarTelefone,

  // Moeda
  valor_total: formatarMoeda,
};
