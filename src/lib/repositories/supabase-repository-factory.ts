import { ClienteSupabaseRepository } from './supabase/cliente-supabase-repository';
import { EventoSupabaseRepository } from './supabase/evento-supabase-repository';
import { PagamentoSupabaseRepository } from './supabase/pagamento-supabase-repository';
import { TipoEventoSupabaseRepository } from './supabase/tipo-evento-supabase-repository';
import { CanalEntradaSupabaseRepository } from './supabase/canal-entrada-supabase-repository';
import { TipoCustoSupabaseRepository } from './supabase/tipo-custo-supabase-repository';
import { TipoServicoSupabaseRepository } from './supabase/tipo-servico-supabase-repository';
import { CustoSupabaseRepository } from './supabase/custo-supabase-repository';
import { ServicoEventoSupabaseRepository } from './supabase/servico-evento-supabase-repository';

// Importar interfaces dos repositórios Firebase para manter compatibilidade
import type { ClienteRepository } from './cliente-repository';
import type { EventoRepository } from './evento-repository';
import type { PagamentoRepository } from './pagamento-repository';
import type { TipoEventoRepository } from './tipo-evento-repository';
import type { CanalEntradaRepository } from './canal-entrada-repository';
import type { TipoCustoRepository } from './custo-repository';
import type { TipoServicoRepository } from './servico-repository';
import type { CustoEventoRepository } from './custo-repository';
import type { ServicoEventoRepository } from './servico-repository';

/**
 * Factory para repositórios Supabase
 * Mantém a mesma interface do RepositoryFactory original
 */
export class SupabaseRepositoryFactory {
  private static instance: SupabaseRepositoryFactory;
  
  private clienteRepository: ClienteSupabaseRepository;
  private eventoRepository: EventoSupabaseRepository;
  private pagamentoRepository: PagamentoSupabaseRepository;
  private tipoEventoRepository: TipoEventoSupabaseRepository;
  private canalEntradaRepository: CanalEntradaSupabaseRepository;
  private tipoCustoRepository: TipoCustoSupabaseRepository;
  private tipoServicoRepository: TipoServicoSupabaseRepository;
  private custoEventoRepository: CustoSupabaseRepository;
  private servicoEventoRepository: ServicoEventoSupabaseRepository;

  private constructor() {
    this.clienteRepository = new ClienteSupabaseRepository();
    this.eventoRepository = new EventoSupabaseRepository();
    this.pagamentoRepository = new PagamentoSupabaseRepository();
    this.tipoEventoRepository = new TipoEventoSupabaseRepository();
    this.canalEntradaRepository = new CanalEntradaSupabaseRepository();
    this.tipoCustoRepository = new TipoCustoSupabaseRepository();
    this.tipoServicoRepository = new TipoServicoSupabaseRepository();
    this.custoEventoRepository = new CustoSupabaseRepository();
    this.servicoEventoRepository = new ServicoEventoSupabaseRepository();
  }

  public static getInstance(): SupabaseRepositoryFactory {
    if (!SupabaseRepositoryFactory.instance) {
      SupabaseRepositoryFactory.instance = new SupabaseRepositoryFactory();
    }
    return SupabaseRepositoryFactory.instance;
  }

  // Métodos getter mantendo a mesma interface
  public getClienteRepository(): ClienteSupabaseRepository {
    return this.clienteRepository;
  }

  public getEventoRepository(): EventoSupabaseRepository {
    return this.eventoRepository;
  }

  public getPagamentoRepository(): PagamentoSupabaseRepository {
    return this.pagamentoRepository;
  }

  public getTipoEventoRepository(): TipoEventoSupabaseRepository {
    return this.tipoEventoRepository;
  }

  public getCanalEntradaRepository(): CanalEntradaSupabaseRepository {
    return this.canalEntradaRepository;
  }

  public getTipoCustoRepository(): TipoCustoSupabaseRepository {
    return this.tipoCustoRepository;
  }

  public getTipoServicoRepository(): TipoServicoSupabaseRepository {
    return this.tipoServicoRepository;
  }

  public getCustoEventoRepository(): CustoSupabaseRepository {
    return this.custoEventoRepository;
  }

  public getServicoEventoRepository(): ServicoEventoSupabaseRepository {
    return this.servicoEventoRepository;
  }
}

// Exportar instância singleton
export const supabaseRepositoryFactory = SupabaseRepositoryFactory.getInstance();

