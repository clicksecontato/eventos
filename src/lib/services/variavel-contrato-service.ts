import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { VariavelContrato } from '@/types';

export class VariavelContratoService {
  /**
   * Valida o formato da chave da variável
   * Regras: apenas letras, números e underscore, sem espaços
   */
  static validarChave(chave: string): { valido: boolean; erro?: string } {
    if (!chave || chave.trim() === '') {
      return { valido: false, erro: 'Chave não pode estar vazia' };
    }

    // Apenas letras, números e underscore
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(chave)) {
      return { 
        valido: false, 
        erro: 'Chave deve conter apenas letras, números e underscore, e começar com letra ou underscore' 
      };
    }

    return { valido: true };
  }

  /**
   * Formata array como string separada por vírgula
   * Ex: ["item1", "item2"] → "item1, item2"
   */
  static formatarVariavelMultipla(valores: string[] | any[]): string {
    if (!Array.isArray(valores)) {
      return String(valores || '');
    }
    
    return valores
      .filter(v => v !== null && v !== undefined && v !== '')
      .map(v => String(v).trim())
      .join(', ');
  }

  /**
   * Obtém todas as variáveis disponíveis para um usuário
   * Retorna objeto com todas as variáveis (configuração + customizadas + evento se fornecido)
   */
  static async obterTodasVariaveisDisponiveis(
    userId: string, 
    eventoId?: string
  ): Promise<Record<string, any>> {
    const variaveis: Record<string, any> = {};

    // 1. Variáveis de configuração do cliente (dados base)
    const configRepo = repositoryFactory.getConfiguracaoContratoRepository();
    const camposFixos = await configRepo.getCamposFixos(userId);
    Object.assign(variaveis, camposFixos);

    // 2. Variáveis customizadas do usuário
    const variavelRepo = repositoryFactory.getVariavelContratoRepository();
    const variaveisCustomizadas = await variavelRepo.findAtivasByUserId(userId);
    
    for (const variavel of variaveisCustomizadas) {
      if (variavel.tipo === 'multipla') {
        // Para variáveis múltiplas, se houver valor padrão, converter para array
        if (variavel.valorPadrao) {
          const valores = variavel.valorPadrao.split(',').map(v => v.trim()).filter(v => v);
          variaveis[variavel.chave] = valores; // Manter como array para processamento
        } else {
          variaveis[variavel.chave] = []; // Array vazio
        }
      } else {
        // Variável única: usar valor padrão ou string vazia
        variaveis[variavel.chave] = variavel.valorPadrao || '';
      }
    }

    // 3. Variáveis do evento (se fornecido)
    if (eventoId) {
      const { ContratoService } = await import('./contrato-service');
      const eventoRepo = repositoryFactory.getEventoRepository();
      const evento = await eventoRepo.findById(eventoId, userId);
      
      if (evento) {
        const servicosRepo = repositoryFactory.getServicoEventoRepository();
        const servicosEvento = await servicosRepo.findByEventoId(eventoId, userId);
        
        // Obter dados do evento usando método existente
        const dadosEvento = await ContratoService.preencherDadosDoEvento(
          evento, 
          {} as any, // Modelo não necessário aqui
          servicosEvento
        );
        
        // Adicionar variável múltipla para tipos de serviço
        if (servicosEvento && servicosEvento.length > 0) {
          const tiposServico = servicosEvento
            .filter(s => !s.removido && s.tipoServico)
            .map(s => s.tipoServico.nome)
            .filter((nome, index, array) => array.indexOf(nome) === index);
          
          dadosEvento.tipos_servico = tiposServico; // Array para processamento
        }
        
        Object.assign(variaveis, dadosEvento);
      }
    }

    return variaveis;
  }

  /**
   * Obtém metadados das variáveis disponíveis (apenas chaves, sem valores)
   */
  static async obterMetadadosVariaveis(userId: string): Promise<{
    configuracoes: string[];
    customizadas: { chave: string; tipo: 'unica' | 'multipla' }[];
    evento: string[];
  }> {
    const configRepo = repositoryFactory.getConfiguracaoContratoRepository();
    const camposFixos = await configRepo.getCamposFixos(userId);
    const configuracoes = Object.keys(camposFixos);

    const variavelRepo = repositoryFactory.getVariavelContratoRepository();
    const variaveisCustomizadas = await variavelRepo.findAtivasByUserId(userId);
    const customizadas = variaveisCustomizadas.map(v => ({ 
      chave: v.chave, 
      tipo: v.tipo as 'unica' | 'multipla' 
    }));

    // Variáveis do evento (hardcoded baseado no que ContratoService.preencherDadosDoEvento retorna)
    const evento = [
      // Dados do cliente do evento
      'nome_cliente', 'cpf_cliente', 'email_cliente', 'telefone_cliente',
      'endereco_cliente', 'cep_cliente', 'instagram_cliente', 'id_cliente',
      // Dados do contratante (pode ser diferente do cliente)
      'nome_contratante', 'cpf_contratante', 'email_contratante', 'telefone_contratante',
      'endereco_contratante', 'cep_contratante',
      // Dados do evento
      'nome_evento', 'tipo_evento', 'data_evento', 'local_evento', 'endereco_evento', 
      'numero_convidados', 'valor_total', 'valor_total_formatado', 'horario_inicio', 
      'horario_termino', 'duracao_servico', 'observacoes_evento', 'tipo_servico', 
      'tipos_servico', 'data_contrato'
    ];

    return {
      configuracoes,
      customizadas,
      evento
    };
  }
}
