import { UserRepository } from './user-repository';
import { ArquivoRepository } from './arquivo-repository';
import { GoogleCalendarTokenRepository } from './google-calendar-token-repository';
import { PlanoRepository } from './plano-repository';
import { FuncionalidadeRepository } from './funcionalidade-repository';
import { AssinaturaRepository } from './assinatura-repository';
import { PasswordResetTokenRepository } from './password-reset-token-repository';
import { PagamentoGlobalRepository } from './pagamento-global-repository';
import { CustoGlobalRepository } from './custo-global-repository';
import { ServicoGlobalRepository } from './servico-global-repository';
import { getProvedorDadosAtual } from '@/lib/config/data-provider';
import type { AdminUserRepository } from './admin-user-repository';
import type { AdminPlanoRepository } from './admin-plano-repository';
import type { AdminAssinaturaRepository } from './admin-assinatura-repository';
import type { AdminFuncionalidadeRepository } from './admin-funcionalidade-repository';
import type { AdminPasswordResetTokenRepository } from './admin-password-reset-token-repository';

// Importar repositórios Supabase
import { ClienteSupabaseRepository } from './supabase/cliente-supabase-repository';
import { EventoSupabaseRepository } from './supabase/evento-supabase-repository';
import { PagamentoSupabaseRepository } from './supabase/pagamento-supabase-repository';
import { TipoEventoSupabaseRepository } from './supabase/tipo-evento-supabase-repository';
import { CanalEntradaSupabaseRepository } from './supabase/canal-entrada-supabase-repository';
import { TipoCustoSupabaseRepository } from './supabase/tipo-custo-supabase-repository';
import { TipoServicoSupabaseRepository } from './supabase/tipo-servico-supabase-repository';
import { CustoSupabaseRepository } from './supabase/custo-supabase-repository';
import { ServicoEventoSupabaseRepository } from './supabase/servico-evento-supabase-repository';
import { ContratoSupabaseRepository } from './supabase/contrato-supabase-repository';
import { ContratoEventoAuditoriaSupabaseRepository } from './supabase/contrato-evento-auditoria-supabase-repository';
import { ContratoParteSupabaseRepository } from './supabase/contrato-parte-supabase-repository';
import { ModeloContratoSupabaseRepository } from './supabase/modelo-contrato-supabase-repository';
import { ConfiguracaoContratoSupabaseRepository } from './supabase/configuracao-contrato-supabase-repository';
import { VariavelContratoSupabaseRepository } from './supabase/variavel-contrato-supabase-repository';
import { RelatoriosDiariosSupabaseRepository } from './supabase/relatorios-diarios-supabase-repository';
import { RelatorioCacheSupabaseRepository } from './supabase/relatorio-cache-supabase-repository';
import { AnexoEventoSupabaseRepository } from './supabase/anexo-evento-supabase-repository';
import { AnexoPagamentoSupabaseRepository } from './supabase/anexo-pagamento-supabase-repository';
import { AnexoCustoSupabaseRepository } from './supabase/anexo-custo-supabase-repository';
import { PreCadastroEventoSupabaseRepository } from './supabase/pre-cadastro-evento-supabase-repository';
import { PreCadastroServicoSupabaseRepository } from './supabase/pre-cadastro-servico-supabase-repository';
import { ValoresAtrasadosSupabaseRepository } from './supabase/valores-atrasados-supabase-repository';
import { AgendamentoProfissionalSupabaseRepository } from './supabase/agendamento-profissional-supabase-repository';
import { AgendamentoDisponibilidadeSupabaseRepository } from './supabase/agendamento-disponibilidade-supabase-repository';
import { AgendamentoBloqueioSupabaseRepository } from './supabase/agendamento-bloqueio-supabase-repository';
import { AgendamentoAlocacaoSupabaseRepository } from './supabase/agendamento-alocacao-supabase-repository';

type ClassConstructor<T> = new () => T;

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getModuleKeys(obj: Record<string, unknown>): string[] {
  return Reflect.ownKeys(obj).map((key) => String(key));
}

function findConstructorRecursive<T>(
  value: unknown,
  className: string,
  visited: Set<unknown>,
  depth: number
): ClassConstructor<T> | null {
  if (!isObjectLike(value) || visited.has(value) || depth > 5) {
    return null;
  }
  visited.add(value);

  const keys = getModuleKeys(value);

  // Prioridade 1: chave exata com o nome esperado
  if (keys.includes(className)) {
    const direct = value[className];
    if (typeof direct === 'function') {
      return direct as ClassConstructor<T>;
    }
  }

  // Prioridade 2: default function direto
  const defaultValue = value.default;
  if (typeof defaultValue === 'function') {
    return defaultValue as ClassConstructor<T>;
  }

  // Prioridade 3: função cujo nome bate (quando a chave foi alterada pelo bundle)
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'function' && candidate.name === className) {
      return candidate as ClassConstructor<T>;
    }
  }

  // Prioridade 4: buscar recursivamente em default e demais exports-objeto
  const nestedValues: unknown[] = [];
  if (isObjectLike(defaultValue)) {
    nestedValues.push(defaultValue);
  }
  for (const key of keys) {
    if (key === 'default') continue;
    const nested = value[key];
    if (isObjectLike(nested)) {
      nestedValues.push(nested);
    }
  }
  for (const nested of nestedValues) {
    const found = findConstructorRecursive<T>(nested, className, visited, depth + 1);
    if (found) return found;
  }

  // Prioridade 5: se houver apenas uma função exportada no nível atual, usa como fallback
  const allFunctions = keys
    .map((key) => value[key])
    .filter((item): item is ClassConstructor<T> => typeof item === 'function');
  if (allFunctions.length === 1) {
    return allFunctions[0];
  }

  return null;
}

function resolveRepositoryClass<T>(mod: unknown, className: string): ClassConstructor<T> {
  if (!isObjectLike(mod)) {
    throw new Error(`Módulo inválido ao carregar ${className}`);
  }

  const resolved = findConstructorRecursive<T>(mod, className, new Set<unknown>(), 0);
  if (resolved) {
    return resolved;
  }

  throw new Error(`Classe ${className} não encontrada no módulo`);
}

/**
 * Factory que inicializa repositórios com regras fixas:
 * - Repositórios Supabase: Clientes, Eventos, Pagamentos, Custos, Serviços, Canais, Tipos, Contratos, Relatórios
 * - Repositórios Firestore: Usuários, Arquivos, Google Calendar Tokens, Planos, Assinaturas, Funcionalidades
 */
export class RepositoryFactory {
  private static instance: RepositoryFactory;
  
  // Repositórios Supabase (sempre)
  private clienteRepository: ClienteSupabaseRepository;
  private eventoRepository: EventoSupabaseRepository;
  private pagamentoRepository: PagamentoSupabaseRepository;
  private custoEventoRepository: CustoSupabaseRepository;
  private tipoCustoRepository: TipoCustoSupabaseRepository;
  private servicoEventoRepository: ServicoEventoSupabaseRepository;
  private tipoServicoRepository: TipoServicoSupabaseRepository;
  private canalEntradaRepository: CanalEntradaSupabaseRepository;
  private tipoEventoRepository: TipoEventoSupabaseRepository;
  private contratoRepository: ContratoSupabaseRepository;
  private contratoEventoAuditoriaRepository: ContratoEventoAuditoriaSupabaseRepository;
  private contratoParteRepository: ContratoParteSupabaseRepository;
  private modeloContratoRepository: ModeloContratoSupabaseRepository;
  private configuracaoContratoRepository: ConfiguracaoContratoSupabaseRepository;
  private variavelContratoRepository: VariavelContratoSupabaseRepository;
  private relatoriosDiariosRepository: RelatoriosDiariosSupabaseRepository;
  private relatorioCacheRepository: RelatorioCacheSupabaseRepository;
  private anexoEventoRepository: AnexoEventoSupabaseRepository;
  private anexoPagamentoRepository: AnexoPagamentoSupabaseRepository;
  private anexoCustoRepository: AnexoCustoSupabaseRepository;
  private preCadastroEventoRepository: PreCadastroEventoSupabaseRepository;
  private preCadastroServicoRepository: PreCadastroServicoSupabaseRepository;
  private valoresAtrasadosRepository: ValoresAtrasadosSupabaseRepository;
  private agendamentoProfissionalRepository: AgendamentoProfissionalSupabaseRepository;
  private agendamentoDisponibilidadeRepository: AgendamentoDisponibilidadeSupabaseRepository;
  private agendamentoBloqueioRepository: AgendamentoBloqueioSupabaseRepository;
  private agendamentoAlocacaoRepository: AgendamentoAlocacaoSupabaseRepository;

  // Repositórios Firestore (sempre)
  private userRepository: UserRepository;
  private arquivoRepository: ArquivoRepository; // Mantido para compatibilidade, mas não usado para anexos de eventos
  private googleCalendarTokenRepository: GoogleCalendarTokenRepository;
  private planoRepository: PlanoRepository;
  private funcionalidadeRepository: FuncionalidadeRepository;
  private assinaturaRepository: AssinaturaRepository;
  private passwordResetTokenRepository: PasswordResetTokenRepository;
  
  // Repositórios Globais Firestore (para normalização)
  private pagamentoGlobalRepository: PagamentoGlobalRepository;
  private custoGlobalRepository: CustoGlobalRepository;
  private servicoGlobalRepository: ServicoGlobalRepository;
  
  // Repositórios Admin (server-only, bypass regras)
  private adminUserRepository?: AdminUserRepository;
  private adminPlanoRepository?: AdminPlanoRepository;
  private adminAssinaturaRepository?: AdminAssinaturaRepository;
  private adminFuncionalidadeRepository?: AdminFuncionalidadeRepository;
  private adminPasswordResetTokenRepository?: AdminPasswordResetTokenRepository;

  private constructor() {
    // Mantém o provider explícito e travado no provedor atual.
    getProvedorDadosAtual();

    // Inicializar repositórios Supabase
    // Se Supabase não estiver configurado, BaseSupabaseRepository lançará erro claro
    this.clienteRepository = new ClienteSupabaseRepository();
    this.eventoRepository = new EventoSupabaseRepository();
    this.pagamentoRepository = new PagamentoSupabaseRepository();
    this.custoEventoRepository = new CustoSupabaseRepository();
    this.tipoCustoRepository = new TipoCustoSupabaseRepository();
    this.servicoEventoRepository = new ServicoEventoSupabaseRepository();
    this.tipoServicoRepository = new TipoServicoSupabaseRepository();
    this.canalEntradaRepository = new CanalEntradaSupabaseRepository();
    this.tipoEventoRepository = new TipoEventoSupabaseRepository();
    this.contratoRepository = new ContratoSupabaseRepository();
    this.contratoEventoAuditoriaRepository = new ContratoEventoAuditoriaSupabaseRepository();
    this.contratoParteRepository = new ContratoParteSupabaseRepository();
    this.modeloContratoRepository = new ModeloContratoSupabaseRepository();
    this.configuracaoContratoRepository = new ConfiguracaoContratoSupabaseRepository();
    this.variavelContratoRepository = new VariavelContratoSupabaseRepository();
    this.relatoriosDiariosRepository = new RelatoriosDiariosSupabaseRepository();
    this.relatorioCacheRepository = new RelatorioCacheSupabaseRepository();
    this.anexoEventoRepository = new AnexoEventoSupabaseRepository();
    this.anexoPagamentoRepository = new AnexoPagamentoSupabaseRepository();
    this.anexoCustoRepository = new AnexoCustoSupabaseRepository();
    this.preCadastroEventoRepository = new PreCadastroEventoSupabaseRepository();
    this.preCadastroServicoRepository = new PreCadastroServicoSupabaseRepository();
    this.valoresAtrasadosRepository = new ValoresAtrasadosSupabaseRepository();
    this.agendamentoProfissionalRepository = new AgendamentoProfissionalSupabaseRepository();
    this.agendamentoDisponibilidadeRepository = new AgendamentoDisponibilidadeSupabaseRepository();
    this.agendamentoBloqueioRepository = new AgendamentoBloqueioSupabaseRepository();
    this.agendamentoAlocacaoRepository = new AgendamentoAlocacaoSupabaseRepository();

    // Inicializar repositórios Firestore
    this.userRepository = new UserRepository();
    this.arquivoRepository = new ArquivoRepository();
    this.googleCalendarTokenRepository = new GoogleCalendarTokenRepository();
    this.planoRepository = new PlanoRepository();
    this.funcionalidadeRepository = new FuncionalidadeRepository();
    this.assinaturaRepository = new AssinaturaRepository();
    this.passwordResetTokenRepository = new PasswordResetTokenRepository();
    
    // Inicializar repositórios globais Firestore
    this.pagamentoGlobalRepository = new PagamentoGlobalRepository();
    this.custoGlobalRepository = new CustoGlobalRepository();
    this.servicoGlobalRepository = new ServicoGlobalRepository();

    // Repositórios Admin são carregados lazy e apenas no servidor.
  }

  public static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  // Métodos getter - Repositórios Supabase
  public getClienteRepository(): ClienteSupabaseRepository {
    return this.clienteRepository;
  }

  public getEventoRepository(): EventoSupabaseRepository {
    return this.eventoRepository;
  }

  public getPagamentoRepository(): PagamentoSupabaseRepository {
    return this.pagamentoRepository;
  }

  public getCustoEventoRepository(): CustoSupabaseRepository {
    return this.custoEventoRepository;
  }

  public getTipoCustoRepository(): TipoCustoSupabaseRepository {
    return this.tipoCustoRepository;
  }

  public getServicoEventoRepository(): ServicoEventoSupabaseRepository {
    return this.servicoEventoRepository;
  }

  public getTipoServicoRepository(): TipoServicoSupabaseRepository {
    return this.tipoServicoRepository;
  }

  public getCanalEntradaRepository(): CanalEntradaSupabaseRepository {
    return this.canalEntradaRepository;
  }

  public getTipoEventoRepository(): TipoEventoSupabaseRepository {
    return this.tipoEventoRepository;
  }

  public getContratoRepository(): ContratoSupabaseRepository {
    return this.contratoRepository;
  }

  public getContratoEventoAuditoriaRepository(): ContratoEventoAuditoriaSupabaseRepository {
    return this.contratoEventoAuditoriaRepository;
  }

  public getContratoParteRepository(): ContratoParteSupabaseRepository {
    return this.contratoParteRepository;
  }

  public getModeloContratoRepository(): ModeloContratoSupabaseRepository {
    return this.modeloContratoRepository;
  }

  public getConfiguracaoContratoRepository(): ConfiguracaoContratoSupabaseRepository {
    return this.configuracaoContratoRepository;
  }

  public getVariavelContratoRepository(): VariavelContratoSupabaseRepository {
    return this.variavelContratoRepository;
  }

  public getRelatoriosDiariosRepository(): RelatoriosDiariosSupabaseRepository {
    return this.relatoriosDiariosRepository;
  }

  public getRelatorioCacheRepository(): RelatorioCacheSupabaseRepository {
    return this.relatorioCacheRepository;
  }

  public getAnexoEventoRepository(): AnexoEventoSupabaseRepository {
    return this.anexoEventoRepository;
  }

  public getAnexoPagamentoRepository(): AnexoPagamentoSupabaseRepository {
    return this.anexoPagamentoRepository;
  }

  public getAnexoCustoRepository(): AnexoCustoSupabaseRepository {
    return this.anexoCustoRepository;
  }

  public getPreCadastroEventoRepository(): PreCadastroEventoSupabaseRepository {
    return this.preCadastroEventoRepository;
  }

  public getPreCadastroServicoRepository(): PreCadastroServicoSupabaseRepository {
    return this.preCadastroServicoRepository;
  }

  public getValoresAtrasadosRepository(): ValoresAtrasadosSupabaseRepository {
    return this.valoresAtrasadosRepository;
  }

  public getAgendamentoProfissionalRepository(): AgendamentoProfissionalSupabaseRepository {
    return this.agendamentoProfissionalRepository;
  }

  public getAgendamentoDisponibilidadeRepository(): AgendamentoDisponibilidadeSupabaseRepository {
    return this.agendamentoDisponibilidadeRepository;
  }

  public getAgendamentoBloqueioRepository(): AgendamentoBloqueioSupabaseRepository {
    return this.agendamentoBloqueioRepository;
  }

  public getAgendamentoAlocacaoRepository(): AgendamentoAlocacaoSupabaseRepository {
    return this.agendamentoAlocacaoRepository;
  }

  // Métodos getter - Repositórios Firestore
  public getUserRepository(): UserRepository {
    return this.userRepository;
  }

  public getArquivoRepository(): ArquivoRepository {
    return this.arquivoRepository;
  }

  public getGoogleCalendarTokenRepository(): GoogleCalendarTokenRepository {
    return this.googleCalendarTokenRepository;
  }

  public getPlanoRepository(): PlanoRepository {
    return this.planoRepository;
  }

  public getFuncionalidadeRepository(): FuncionalidadeRepository {
    return this.funcionalidadeRepository;
  }

  public getAssinaturaRepository(): AssinaturaRepository {
    return this.assinaturaRepository;
  }

  public getPasswordResetTokenRepository(): PasswordResetTokenRepository {
    return this.passwordResetTokenRepository;
  }

  // Métodos getter - Repositórios Globais Firestore
  public getPagamentoGlobalRepository(): PagamentoGlobalRepository {
    return this.pagamentoGlobalRepository;
  }

  public getCustoGlobalRepository(): CustoGlobalRepository {
    return this.custoGlobalRepository;
  }

  public getServicoGlobalRepository(): ServicoGlobalRepository {
    return this.servicoGlobalRepository;
  }

  // Métodos getter - Repositórios Admin (server-only)
  public getAdminUserRepository(): AdminUserRepository {
    if (!this.adminUserRepository) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./admin-user-repository');
      const AdminUserRepositoryCtor = resolveRepositoryClass<AdminUserRepository>(mod, 'AdminUserRepository');
      this.adminUserRepository = new AdminUserRepositoryCtor();
    }
    return this.adminUserRepository!;
  }

  public getAdminPlanoRepository(): AdminPlanoRepository {
    if (!this.adminPlanoRepository) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./admin-plano-repository');
      const AdminPlanoRepositoryCtor = resolveRepositoryClass<AdminPlanoRepository>(mod, 'AdminPlanoRepository');
      this.adminPlanoRepository = new AdminPlanoRepositoryCtor();
    }
    return this.adminPlanoRepository!;
  }

  public getAdminAssinaturaRepository(): AdminAssinaturaRepository {
    if (!this.adminAssinaturaRepository) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./admin-assinatura-repository');
      const AdminAssinaturaRepositoryCtor = resolveRepositoryClass<AdminAssinaturaRepository>(mod, 'AdminAssinaturaRepository');
      this.adminAssinaturaRepository = new AdminAssinaturaRepositoryCtor();
    }
    return this.adminAssinaturaRepository!;
  }

  public getAdminFuncionalidadeRepository(): AdminFuncionalidadeRepository {
    if (!this.adminFuncionalidadeRepository) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./admin-funcionalidade-repository');
      const AdminFuncionalidadeRepositoryCtor = resolveRepositoryClass<AdminFuncionalidadeRepository>(mod, 'AdminFuncionalidadeRepository');
      this.adminFuncionalidadeRepository = new AdminFuncionalidadeRepositoryCtor();
    }
    return this.adminFuncionalidadeRepository!;
  }

  public getAdminPasswordResetTokenRepository(): AdminPasswordResetTokenRepository {
    if (!this.adminPasswordResetTokenRepository) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./admin-password-reset-token-repository');
      const AdminPasswordResetTokenRepositoryCtor = resolveRepositoryClass<AdminPasswordResetTokenRepository>(mod, 'AdminPasswordResetTokenRepository');
      this.adminPasswordResetTokenRepository = new AdminPasswordResetTokenRepositoryCtor();
    }
    return this.adminPasswordResetTokenRepository!;
  }
}

// Exportar instância singleton
export const repositoryFactory = RepositoryFactory.getInstance();
