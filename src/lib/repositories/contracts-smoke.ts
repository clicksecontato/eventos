import { repositoryFactory } from './repository-factory';

type ContratoBasicoComId = { id: string };

interface EventoRepositoryContrato {
  findAll(userId: string): Promise<ContratoBasicoComId[]>;
  updateEvento(id: string, evento: Record<string, unknown>, userId: string): Promise<ContratoBasicoComId>;
}

interface ClienteRepositoryContrato {
  findAll(userId: string): Promise<ContratoBasicoComId[]>;
  updateCliente(id: string, cliente: Record<string, unknown>, userId: string): Promise<ContratoBasicoComId>;
}

interface ServicoCatalogoRepositoryContrato {
  findAll(userId: string): Promise<ContratoBasicoComId[]>;
  createTipoServico(
    tipoServico: { nome: string; descricao?: string; valorPadrao?: number; ativo: boolean },
    userId: string
  ): Promise<ContratoBasicoComId>;
}

interface AssinaturaRepositoryContrato {
  findAllByUserId(userId: string): Promise<ContratoBasicoComId[]>;
  findByUserId(userId: string): Promise<ContratoBasicoComId | null>;
}

interface PlanoRepositoryContrato {
  findById(id: string): Promise<ContratoBasicoComId | null>;
  findByCodigoHotmart(codigo: string): Promise<ContratoBasicoComId | null>;
}

export function verificarContratosFactory() {
  return {
    evento: repositoryFactory.getEventoRepository() as EventoRepositoryContrato,
    cliente: repositoryFactory.getClienteRepository() as ClienteRepositoryContrato,
    servicoCatalogo: repositoryFactory.getTipoServicoRepository() as ServicoCatalogoRepositoryContrato,
    assinatura: repositoryFactory.getAssinaturaRepository() as AssinaturaRepositoryContrato,
    plano: repositoryFactory.getPlanoRepository() as PlanoRepositoryContrato,
    adminAssinatura: repositoryFactory.getAdminAssinaturaRepository() as AssinaturaRepositoryContrato,
    adminPlano: repositoryFactory.getAdminPlanoRepository() as PlanoRepositoryContrato,
  };
}

