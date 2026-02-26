import { ClienteRepository } from './cliente-repository';
import { EventoRepository } from './evento-repository';
import { PagamentoRepository } from './pagamento-repository';
import { CustoEventoRepository, TipoCustoRepository } from './custo-repository';
import { ServicoEventoRepository, TipoServicoRepository } from './servico-repository';
import { CanalEntradaRepository } from './canal-entrada-repository';
import { UserRepository } from './user-repository';
import { ArquivoRepository } from './arquivo-repository';
import { TipoEventoRepository } from './tipo-evento-repository';
import { GoogleCalendarTokenRepository } from './google-calendar-token-repository';
import { ModeloContratoRepository } from './modelo-contrato-repository';
import { ConfiguracaoContratoRepository } from './configuracao-contrato-repository';
import { ContratoRepository } from './contrato-repository';
import { VariavelContratoRepository } from './variavel-contrato-repository';
import { RelatoriosDiariosRepository } from './relatorios-diarios-repository';
import { RelatorioCacheRepository } from './relatorio-cache-repository';
import { PlanoRepository } from './plano-repository';
import { FuncionalidadeRepository } from './funcionalidade-repository';
import { AssinaturaRepository } from './assinatura-repository';
import { PasswordResetTokenRepository } from './password-reset-token-repository';
import { PagamentoGlobalRepository } from './pagamento-global-repository';
import { CustoGlobalRepository } from './custo-global-repository';
import { ServicoGlobalRepository } from './servico-global-repository';

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

  private constructor() {
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
}

// Exportar instância singleton
export const repositoryFactory = RepositoryFactory.getInstance();
