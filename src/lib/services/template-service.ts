import { FORMATADORES_VARIAVEIS } from '@/lib/utils/formatadores';

export class TemplateService {
  private static normalizarTamanhoMarcaDagua(valor: unknown): number {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 70;
    return Math.max(20, Math.min(120, Math.round(numero)));
  }

  private static processarMarcaDagua(template: string, dados: Record<string, unknown>): string {
    const placeholder = /\{\{marca_dagua_url\}\}/g;
    if (!template.includes('{{marca_dagua_url}}')) {
      return template;
    }

    const url = String(dados.marca_dagua_url || '').trim();
    const tamanho = this.normalizarTamanhoMarcaDagua(dados.marca_dagua_tamanho_percentual);

    // Remove o placeholder de posição; a marca d'agua é injetada automaticamente no topo do documento.
    let resultado = template.replace(placeholder, '');

    if (!url) {
      return resultado;
    }

    if (resultado.includes('data-marca-dagua-auto="true"')) {
      return resultado;
    }

    const urlSegura = url.replace(/"/g, '&quot;');
    const blocoMarcaDagua = `
<div data-marca-dagua-auto="true" style="position: fixed; inset: 0; pointer-events: none; z-index: 0; display: flex; align-items: center; justify-content: center; overflow: hidden;">
  <img src="${urlSegura}" alt="Marca d'agua" style="max-width: ${tamanho}%; max-height: ${tamanho}%; opacity: 0.08; transform: rotate(-25deg);" />
</div>
`;

    return `${blocoMarcaDagua}${resultado}`;
  }

  /**
   * Formata uma data no formato "DD de mês de YYYY" (ex: "06 de janeiro de 2026")
   */
  private static formatarDataExtenso(data: string | Date | unknown): string {
    if (!data) return '';
    
    let dataObj: Date;
    
    if (data instanceof Date) {
      dataObj = data;
    } else if (typeof data === 'string') {
      // Verificar se está no formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        dataObj = new Date(data + 'T00:00:00');
      } else {
        // Tentar parsear como data
        dataObj = new Date(data);
      }
    } else {
      return String(data);
    }
    
    // Verificar se a data é válida
    if (isNaN(dataObj.getTime())) {
      return String(data);
    }
    
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    
    const dia = dataObj.getDate();
    const mes = meses[dataObj.getMonth()];
    const ano = dataObj.getFullYear();
    
    return `${dia} de ${mes} de ${ano}`;
  }

  static processarPlaceholders(template: string, dados: Record<string, unknown>): string {
    let resultado = template;
    
    // Processar condicionais {{#if variavel}}...{{/if}} de forma recursiva
    // Processa as condicionais mais internas primeiro
    resultado = this.processarCondicionaisRecursivo(resultado, dados);
    
    // Processar variáveis múltiplas [variavel] primeiro (antes das únicas)
    // Formato: [variavel] → "item1, item2, item3"
    Object.keys(dados).forEach(chave => {
      const valor = dados[chave];
      
      // Se for array, formatar como string separada por vírgula
      if (Array.isArray(valor)) {
        const { VariavelContratoService } = require('./variavel-contrato-service');
        const valorFormatado = VariavelContratoService.formatarVariavelMultipla(valor);
        const placeholder = new RegExp(`\\[${chave}\\]`, 'g');
        resultado = resultado.replace(placeholder, valorFormatado);
      }
    });

    // Tratamento especial: ao usar {{marca_dagua_url}}, injeta automaticamente o HTML da marca d'agua.
    resultado = this.processarMarcaDagua(resultado, dados);
    
    // Processar placeholders simples {{variavel}}
    Object.keys(dados).forEach(chave => {
      const valor = dados[chave];
      let valorString: string;
      
      // Se for array, já foi processado acima, pular
      if (Array.isArray(valor)) {
        return;
      }
      
      // Formatar automaticamente campos de data para formato extenso
      if (chave === 'data_evento' || chave === 'data_contrato') {
        valorString = this.formatarDataExtenso(valor);
      } else if (FORMATADORES_VARIAVEIS[chave]) {
        // Aplicar formatação automática (CPF, CNPJ, CEP, telefone, moeda)
        valorString = FORMATADORES_VARIAVEIS[chave](valor);
      } else {
        valorString = valor !== undefined && valor !== null ? String(valor) : '';
      }
      
      const placeholder = new RegExp(`\\{\\{${chave}\\}\\}`, 'g');
      resultado = resultado.replace(placeholder, valorString);
    });

    // Converter espaços consecutivos em &nbsp; no conteúdo de texto do HTML
    // Isso garante que os espaços são preservados em qualquer renderização
    resultado = this.preservarEspacosHtml(resultado);

    return resultado;
  }

  /**
   * Converte sequências de 2+ espaços em &nbsp; apenas no conteúdo de texto do HTML
   * (não altera espaços dentro de tags HTML)
   */
  private static preservarEspacosHtml(html: string): string {
    let result = '';
    let insideTag = false;

    for (let i = 0; i < html.length; i++) {
      if (html[i] === '<') {
        insideTag = true;
        result += '<';
      } else if (html[i] === '>') {
        insideTag = false;
        result += '>';
      } else if (!insideTag && html[i] === ' ') {
        // Contar espaços consecutivos
        let spaceCount = 0;
        const start = i;
        while (i < html.length && html[i] === ' ') {
          spaceCount++;
          i++;
        }
        i--; // Voltar um pois o for vai incrementar

        if (spaceCount >= 2) {
          // Converter cada espaço em &nbsp;
          result += '&nbsp;'.repeat(spaceCount);
        } else {
          result += ' ';
        }
      } else {
        result += html[i];
      }
    }

    return result;
  }

  private static processarCondicionaisRecursivo(template: string, dados: Record<string, unknown>): string {
    let resultado = template;
    const maxIterations = 50; // Prevenir loops infinitos
    let iterations = 0;
    
    // Processar repetidamente até não haver mais condicionais
    while (resultado.includes('{{#if') && iterations < maxIterations) {
      iterations++;
      
      // Encontrar a primeira condicional e seu fechamento correspondente
      const ifStartIndex = resultado.indexOf('{{#if');
      if (ifStartIndex === -1) break;
      
      // Extrair o nome da variável
      const matchStart = resultado.substring(ifStartIndex).match(/^\{\{#if\s+(\w+)\}\}/);
      if (!matchStart) break;
      
      const variavel = matchStart[1];
      const startTagLength = matchStart[0].length;
      const conteudoStart = ifStartIndex + startTagLength;
      
      // Encontrar o {{/if}} correspondente usando contagem de níveis
      let depth = 1;
      let pos = conteudoStart;
      
      while (depth > 0 && pos < resultado.length) {
        const nextIfIndex = resultado.indexOf('{{#if', pos);
        const nextEndIfIndex = resultado.indexOf('{{/if}}', pos);
        
        if (nextEndIfIndex === -1) break; // Não encontrou fechamento
        
        if (nextIfIndex !== -1 && nextIfIndex < nextEndIfIndex) {
          // Encontrou outra condicional aninhada
          depth++;
          pos = nextIfIndex + 5;
        } else {
          // Encontrou fechamento
          depth--;
          if (depth === 0) {
            // Processar esta condicional
            const conteudo = resultado.substring(conteudoStart, nextEndIfIndex);
            const valor = dados[variavel];
            // Verifica se a variável é truthy (não é undefined, null, '', false, 0)
            const isTruthy = valor !== undefined && valor !== null && 
                            (typeof valor === 'string' ? valor !== '' : true) && 
                            valor !== false && valor !== 0;
            
            if (isTruthy) {
              // Mantém o conteúdo (removendo apenas as tags)
              resultado = resultado.substring(0, ifStartIndex) + conteudo + resultado.substring(nextEndIfIndex + 7);
            } else {
              // Remove o bloco completo
              resultado = resultado.substring(0, ifStartIndex) + resultado.substring(nextEndIfIndex + 7);
            }
            break;
          }
          pos = nextEndIfIndex + 7;
        }
      }
      
      // Se não encontrou fechamento, parar
      if (depth > 0) break;
    }
    
    return resultado;
  }

  /**
   * Extrai placeholders do template
   * Retorna objeto com variáveis únicas e múltiplas
   */
  static extrairPlaceholders(template: string): { unicas: string[]; multiplas: string[] } {
    // Variáveis únicas: {{variavel}}
    const matchesUnicas = template.match(/\{\{(\w+)\}\}/g) || [];
    const unicas = matchesUnicas.map(m => m.replace(/\{\{|\}\}/g, ''));
    
    // Variáveis múltiplas: [variavel]
    const matchesMultiplas = template.match(/\[(\w+)\]/g) || [];
    const multiplas = matchesMultiplas.map(m => m.replace(/\[|\]/g, ''));
    
    return { unicas, multiplas };
  }

  /**
   * Valida se todos os placeholders do template estão disponíveis nas variáveis
   */
  static validarPlaceholders(
    template: string, 
    variaveisDisponiveis: string[]
  ): { valido: boolean; erros: string[] } {
    const { unicas, multiplas } = this.extrairPlaceholders(template);
    const chavesDisponiveis = new Set(variaveisDisponiveis);
    const erros: string[] = [];
    
    unicas.forEach(chave => {
      if (!chavesDisponiveis.has(chave)) {
        erros.push(`Variável única '{{${chave}}}' não encontrada nas variáveis disponíveis`);
      }
    });
    
    multiplas.forEach(chave => {
      if (!chavesDisponiveis.has(chave)) {
        erros.push(`Variável múltipla '[${chave}]' não encontrada nas variáveis disponíveis`);
      }
    });
    
    return {
      valido: erros.length === 0,
      erros
    };
  }

  /**
   * Método legado para compatibilidade (mantido para não quebrar código existente)
   */
  static validarPlaceholdersLegado(template: string, campos: { chave: string }[]): boolean {
    const { unicas } = this.extrairPlaceholders(template);
    const chavesCampos = new Set(campos.map(c => c.chave));
    return unicas.every(p => chavesCampos.has(p));
  }
}

