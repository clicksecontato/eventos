/**
 * Utilitários para renderizar variáveis de forma visual
 * Converte {{variavel}} e [variavel] em elementos HTML estilizados
 */

/**
 * Converte variáveis no HTML para spans estilizados (para visualização)
 */
export function renderVariablesAsBadges(html: string): string {
  if (!html) return html;

  // Padrão para variáveis únicas: {{variavel}}
  const patternUnica = /\{\{([^}]+)\}\}/g;
  // Padrão para variáveis múltiplas: [variavel]
  const patternMultipla = /\[([^\]]+)\]/g;

  let result = html;

  // Converter variáveis únicas
  result = result.replace(patternUnica, (match, variavel) => {
    return `<span class="variable-badge variable-unica" data-variable="${variavel}" data-tipo="unica" contenteditable="false">${match}</span>`;
  });

  // Converter variáveis múltiplas
  result = result.replace(patternMultipla, (match, variavel) => {
    // Verificar se não está dentro de uma tag HTML
    if (match.includes('<') || match.includes('>')) {
      return match;
    }
    return `<span class="variable-badge variable-multipla" data-variable="${variavel}" data-tipo="multipla" contenteditable="false">${match}</span>`;
  });

  return result;
}

/**
 * Converte spans de variáveis de volta para o formato original
 */
export function extractVariablesFromHTML(html: string): string {
  if (!html) return html;

  let result = html;

  // Converter spans de variáveis únicas de volta (com regex mais flexível)
  result = result.replace(
    /<span[^>]*class="[^"]*variable-badge[^"]*variable-unica[^"]*"[^>]*data-variable="([^"]+)"[^>]*>.*?<\/span>/gi,
    (match, variavel) => {
      return `{{${variavel}}}`;
    }
  );

  // Converter spans de variáveis múltiplas de volta
  result = result.replace(
    /<span[^>]*class="[^"]*variable-badge[^"]*variable-multipla[^"]*"[^>]*data-variable="([^"]+)"[^>]*>.*?<\/span>/gi,
    (match, variavel) => {
      return `[${variavel}]`;
    }
  );

  // Também tentar extrair diretamente do conteúdo do span se o padrão acima não funcionar
  result = result.replace(
    /<span[^>]*data-variable="([^"]+)"[^>]*data-tipo="unica"[^>]*>\{\{([^}]+)\}\}<\/span>/gi,
    (match, variavel1, variavel2) => {
      return `{{${variavel1 || variavel2}}}`;
    }
  );

  result = result.replace(
    /<span[^>]*data-variable="([^"]+)"[^>]*data-tipo="multipla"[^>]*>\[([^\]]+)\]<\/span>/gi,
    (match, variavel1, variavel2) => {
      return `[${variavel1 || variavel2}]`;
    }
  );

  return result;
}

/**
 * Detecta se uma string contém variáveis
 */
export function hasVariables(text: string): boolean {
  return /\{\{[^}]+\}\}/.test(text) || /\[[^\]]+\]/.test(text);
}
