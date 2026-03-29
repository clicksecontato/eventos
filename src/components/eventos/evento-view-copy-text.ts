import type { AgendamentoAlocacao, Evento, ServicoEvento } from '@/types';

/**
 * Texto plano para copiar resumo do evento (clipboard).
 */
export function formatarTextoEventoParaCopiar(
  evento: Evento,
  alocacoesEvento: AgendamentoAlocacao[],
  profissionaisAlocacao: Map<string, string>,
  servicos: ServicoEvento[] | null | undefined
): string {
  let text = '';

  const formatDatePtBR = (value: Date | string) => {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };
  const getWeekdayPtBR = (value: Date | string) => {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' }).toUpperCase();
  };

  const nomeEvento =
    (evento as Evento & { nomeEvento?: string }).nomeEvento ||
    (evento.tipoEvento
      ? `${evento.tipoEvento}${evento.cliente?.nome ? ` - ${evento.cliente.nome}` : ''}`
      : '') ||
    'Evento';
  text += 'Nome do Evento\n\n';
  text += `${nomeEvento}\n`;

  text += '\n────────────────────────\n\n';

  text += 'Informações do Evento\n\n';
  text += `Data: ${formatDatePtBR(evento.dataEvento)} - ${getWeekdayPtBR(evento.dataEvento)}\n`;
  if (evento.tipoEvento) text += `Tipo: ${evento.tipoEvento}\n`;

  text += '\n────────────────────────\n\n';

  text += 'Detalhes do Serviço\n\n';
  const ev = evento as Evento & { horarioInicio?: string; horarioFim?: string; horarioDesmontagem?: string };
  if (ev.horarioInicio) text += `Horário de início: ${ev.horarioInicio}\n`;
  if (ev.horarioFim || ev.horarioDesmontagem) {
    text += `Horário fim: ${ev.horarioFim || ev.horarioDesmontagem}\n`;
  }
  const alocacoesAtivas = alocacoesEvento.filter((item) => item.status !== 'cancelado');
  if (alocacoesAtivas.length > 0) {
    text += 'Profissionais alocados:\n';
    alocacoesAtivas.forEach((item) => {
      const nomeProfissional = profissionaisAlocacao.get(item.profissionalId) || 'Profissional';
      const inicio = item.inicioTs.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const fim = item.fimTs.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      text += `- ${nomeProfissional}: ${inicio} às ${fim} (${item.status})\n`;
    });
  }

  text += '\n────────────────────────\n\n';

  text += 'Serviços do Evento\n\n';
  const nomesServicos = (servicos || []).map((s) => s.tipoServico?.nome).filter(Boolean);
  text += nomesServicos.length > 0 ? nomesServicos.join(', ') : '-';
  text += '\n';

  return text;
}
