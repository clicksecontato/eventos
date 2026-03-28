import 'server-only';

import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { generateUUID } from '@/lib/utils/uuid';
import type { TipoEventoContratoAuditoria } from '@/types';

/**
 * Registra evento de auditoria do contrato. Falhas são apenas logadas — não interrompem o fluxo principal.
 */
export async function registrarEventoAuditoriaContrato(params: {
  contratoId: string;
  userId: string;
  actorUserId?: string | null;
  tipo: TipoEventoContratoAuditoria;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const repo = repositoryFactory.getContratoEventoAuditoriaRepository();
    await repo.inserir({
      id: generateUUID(),
      contratoId: params.contratoId,
      userId: params.userId,
      actorUserId: params.actorUserId,
      tipoEvento: params.tipo,
      payload: params.payload ?? {},
    });
  } catch (e) {
    console.error('[registrarEventoAuditoriaContrato]', params.tipo, params.contratoId, e);
  }
}
