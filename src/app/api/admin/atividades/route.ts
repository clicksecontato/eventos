import { NextResponse } from 'next/server';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import { requireAdmin, handleApiError, createApiResponse } from '@/lib/api/route-helpers';
import { User } from '@/types';
import { Assinatura, StatusAssinatura } from '@/types/funcionalidades';

export type TipoAtividade = 'novo_cadastro' | 'nova_assinatura' | 'cancelamento';

export interface Atividade {
  tipo: TipoAtividade;
  nome: string;
  email: string;
  data: Date;
  detalhes: string;
}

function toDate(v: Date | unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(0);
}

export async function GET() {
  try {
    await requireAdmin();

    const userRepo = new AdminUserRepository();
    const assinaturaRepo = new AdminAssinaturaRepository();
    const planoRepo = new AdminPlanoRepository();

    const [allUsers, allAssinaturas] = await Promise.all([
      userRepo.findAll(),
      assinaturaRepo.findAll()
    ]);

    const usersById = new Map<string, User>(
      allUsers.map((u) => [u.id, u])
    );

    const last50Users = [...allUsers]
      .sort((a, b) => toDate(b.dataCadastro).getTime() - toDate(a.dataCadastro).getTime())
      .slice(0, 50);

    const last50Assinaturas = [...allAssinaturas]
      .sort((a, b) => toDate(b.dataCadastro).getTime() - toDate(a.dataCadastro).getTime())
      .slice(0, 50);

    const atividades: Atividade[] = [];

    for (const user of last50Users) {
      atividades.push({
        tipo: 'novo_cadastro',
        nome: user.nome || '—',
        email: user.email || '—',
        data: toDate(user.dataCadastro),
        detalhes: ''
      });
    }

    const isCancelamento = (s: Assinatura) =>
      (s.status as StatusAssinatura) === 'cancelled' ||
      (s.status as StatusAssinatura) === 'expired' ||
      (s.status as StatusAssinatura) === 'suspended';

    const planoIds = [...new Set(last50Assinaturas.map((a) => a.planoId).filter(Boolean))] as string[];
    const planosById = new Map<string, string>();
    await Promise.all(
      planoIds.map(async (id) => {
        const plano = await planoRepo.findById(id);
        if (plano) planosById.set(id, plano.nome);
      })
    );

    for (const assinatura of last50Assinaturas) {
      const user = usersById.get(assinatura.userId);
      const nome = user?.nome || '—';
      const email = user?.email || '—';
      const planoNome = assinatura.planoId ? planosById.get(assinatura.planoId) || '' : '';

      if (isCancelamento(assinatura)) {
        const data =
          toDate(assinatura.dataAtualizacao).getTime() > 0
            ? toDate(assinatura.dataAtualizacao)
            : toDate(assinatura.dataFim).getTime() > 0
              ? toDate(assinatura.dataFim)
              : toDate(assinatura.dataCadastro);
        atividades.push({
          tipo: 'cancelamento',
          nome,
          email,
          data,
          detalhes: planoNome
        });
      } else {
        const data =
          toDate(assinatura.dataInicio).getTime() > 0
            ? toDate(assinatura.dataInicio)
            : toDate(assinatura.dataCadastro);
        atividades.push({
          tipo: 'nova_assinatura',
          nome,
          email,
          data,
          detalhes: planoNome
        });
      }
    }

    atividades.sort((a, b) => b.data.getTime() - a.data.getTime());
    const result = atividades.slice(0, 50);

    return createApiResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
