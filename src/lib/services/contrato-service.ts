import { Evento, ModeloContrato, CampoContrato, ServicoEvento } from '@/types';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { TemplateService } from './template-service';
import { VariavelContratoService } from './variavel-contrato-service';

export class ContratoService {
  static async preencherDadosDoEvento(evento: Evento, modelo: ModeloContrato, servicosEvento?: ServicoEvento[]): Promise<Record<string, any>> {
    const dados: Record<string, any> = {};
    
    // Dados do cliente do evento
    dados.nome_cliente = evento.cliente?.nome || '';
    dados.cpf_cliente = evento.cliente?.cpf || '';
    dados.email_cliente = evento.cliente?.email || '';
    dados.telefone_cliente = evento.cliente?.telefone || '';
    dados.endereco_cliente = evento.cliente?.endereco || '';
    dados.cep_cliente = evento.cliente?.cep || '';
    dados.instagram_cliente = evento.cliente?.instagram || '';
    dados.id_cliente = evento.cliente?.id || '';
    
    // Dados do contratante (pode ser diferente do cliente)
    dados.nome_contratante = evento.contratante || evento.cliente?.nome || '';
    dados.cpf_contratante = evento.cliente?.cpf || '';
    dados.email_contratante = evento.cliente?.email || '';
    dados.telefone_contratante = evento.cliente?.telefone || '';
    dados.endereco_contratante = evento.cliente?.endereco || '';
    dados.cep_contratante = evento.cliente?.cep || '';
    
    dados.nome_evento = evento.nomeEvento || evento.tipoEvento || 'Evento';
    dados.tipo_evento = evento.tipoEvento || '';
    
    // Formatar data_evento para formato YYYY-MM-DD (necessário para campos date do HTML)
    if (evento.dataEvento) {
      const dataEvento = new Date(evento.dataEvento);
      const ano = dataEvento.getFullYear();
      const mes = String(dataEvento.getMonth() + 1).padStart(2, '0');
      const dia = String(dataEvento.getDate()).padStart(2, '0');
      dados.data_evento = `${ano}-${mes}-${dia}`;
    } else {
      dados.data_evento = '';
    }
    
    dados.local_evento = evento.local || '';
    dados.endereco_evento = evento.endereco || '';
    dados.numero_convidados = evento.numeroConvidados || 0;
    dados.valor_total = evento.valorTotal || 0;
    dados.valor_total_formatado = evento.valorTotal ? `R$ ${evento.valorTotal.toFixed(2).replace('.', ',')}` : 'R$ 0,00';
    dados.horario_inicio = evento.horarioInicio || '';
    dados.horario_termino = evento.horarioDesmontagem || '';
    
    // Extrair número de horas do tempoEvento (formato: "X HORAS" ou "X HORAS E Y MINUTOS")
    // Para o campo duracao_servico que é do tipo number, extrair apenas as horas
    if (evento.tempoEvento) {
      const match = evento.tempoEvento.match(/(\d+)\s*HORA/i);
      if (match) {
        dados.duracao_servico = parseInt(match[1], 10);
      } else {
        // Se não encontrar padrão, tentar extrair qualquer número
        const numeroMatch = evento.tempoEvento.match(/(\d+)/);
        dados.duracao_servico = numeroMatch ? parseInt(numeroMatch[1], 10) : '';
      }
    } else {
      dados.duracao_servico = '';
    }
    
    dados.observacoes_evento = evento.observacoes || '';

    // Preencher tipo_servico com os serviços do evento
    let tiposServicoTexto = '';
    if (servicosEvento && servicosEvento.length > 0) {
      // Filtrar serviços não removidos e extrair nomes dos tipos de serviço
      const tiposServicoNomes = servicosEvento
        .filter(servico => !servico.removido && servico.tipoServico)
        .map(servico => servico.tipoServico.nome)
        .filter((nome, index, array) => array.indexOf(nome) === index); // Remover duplicatas
      
      tiposServicoTexto = tiposServicoNomes.join(', ') || '';
      dados.tipo_servico = tiposServicoTexto;
    } else {
      dados.tipo_servico = '';
    }
    
    // Preencher servicos_incluidos (mesmo conteúdo de tipo_servico para o modelo "Contrato Click-se fotos instantâneas")
    dados.servicos_incluidos = tiposServicoTexto;
    
    // Adicionar tipos_servico como array para variável múltipla [tipos_servico]
    if (servicosEvento && servicosEvento.length > 0) {
      const tiposServicoArray = servicosEvento
        .filter(servico => !servico.removido && servico.tipoServico)
        .map(servico => servico.tipoServico.nome)
        .filter((nome, index, array) => array.indexOf(nome) === index);
      dados.tipos_servico = tiposServicoArray; // Array para processamento como variável múltipla
    } else {
      dados.tipos_servico = []; // Array vazio
    }

    // Preencher data_contrato com a data atual (formato YYYY-MM-DD)
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    dados.data_contrato = `${ano}-${mes}-${dia}`;

    const configRepo = repositoryFactory.getConfiguracaoContratoRepository();
    const userId = (evento as any).userId || '';
    if (userId) {
      const camposFixos = await configRepo.getCamposFixos(userId);
      Object.assign(dados, camposFixos);
    }

    return dados;
  }

  static processarTemplate(template: string, dados: Record<string, any>): string {
    return TemplateService.processarPlaceholders(template, dados);
  }

  static validarDadosPreenchidos(dados: Record<string, any>, campos: CampoContrato[]): { valido: boolean; erros: string[] } {
    const erros: string[] = [];
    
    campos.forEach(campo => {
      if (campo.obrigatorio) {
        const valor = dados[campo.chave];
        if (!valor || (typeof valor === 'string' && valor.trim() === '')) {
          erros.push(`Campo '${campo.label}' é obrigatório`);
        }
      }
    });

    return {
      valido: erros.length === 0,
      erros
    };
  }

  static async gerarNumeroContrato(userId: string): Promise<string> {
    const contratoRepo = repositoryFactory.getContratoRepository();
    return await contratoRepo.gerarNumeroContrato(userId);
  }

  /**
   * Obtém todas as variáveis disponíveis para processar um template
   * Combina: configuração do cliente + variáveis customizadas + dados do evento (se fornecido)
   */
  static async obterVariaveisParaTemplate(
    userId: string, 
    eventoId?: string
  ): Promise<Record<string, any>> {
    return await VariavelContratoService.obterTodasVariaveisDisponiveis(userId, eventoId);
  }
}

