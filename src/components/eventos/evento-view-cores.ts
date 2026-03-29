/** Classes Tailwind para badge de status de alocação no detalhe do evento. */
export function classeCorStatusAgendamentoAlocacao(status: string): string {
  switch (status) {
    case 'agendado':
      return 'bg-info-bg text-info-text';
    case 'confirmado':
      return 'bg-success-bg text-success-text';
    case 'cancelado':
      return 'bg-error-bg text-error-text';
    default:
      return 'bg-surface text-text-secondary';
  }
}
