import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatarDiaSemanaTitulo(data: Date): string {
  const diaSemana = format(data, 'EEEE', { locale: ptBR });
  return diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
}
