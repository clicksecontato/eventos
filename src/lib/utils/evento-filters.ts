import { Evento } from '@/types';
import { StatusEvento } from '@/types';

/**
 * Funções helper para filtrar eventos válidos para cálculos
 * 
 * Regra de negócio: Eventos cancelados ou arquivados não devem ser
 * incluídos em cálculos de relatórios, dashboard e métricas financeiras.
 */

/**
 * Verifica se um evento é válido para cálculos
 * Eventos cancelados ou arquivados não são válidos
 */
export function isEventoValidoParaCalculo(evento: Evento): boolean {
  // Excluir eventos cancelados
  // Usar type assertion para permitir verificação de 'Cancelado' que pode existir em runtime
  const status = evento.status as string;
  if (status === StatusEvento.CANCELADO || status === 'Cancelado') {
    return false;
  }

  // Excluir eventos arquivados
  if (evento.arquivado === true) {
    return false;
  }

  return true;
}

/**
 * Filtra array de eventos, retornando apenas os válidos para cálculos
 */
export function filtrarEventosValidos(eventos: Evento[]): Evento[] {
  return eventos.filter(isEventoValidoParaCalculo);
}

/**
 * Filtra eventos válidos e com valor total maior que zero
 * Útil para cálculos financeiros
 */
export function filtrarEventosValidosComValor(eventos: Evento[]): Evento[] {
  return eventos.filter(evento => 
    isEventoValidoParaCalculo(evento) && (evento.valorTotal || 0) > 0
  );
}
