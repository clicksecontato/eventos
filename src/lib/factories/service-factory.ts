import { PlanoService } from '../services/plano-service';
import { AssinaturaService } from '../services/assinatura-service';
import { FuncionalidadeService } from '../services/funcionalidade-service';
import { HotmartWebhookService } from '../services/hotmart-webhook-service';
import { GoogleCalendarService } from '../services/google-calendar-service';
import { GoogleCalendarSyncService } from '../services/google-calendar-sync-service';
import { ContratoService } from '../services/contrato-service';
import { PDFService } from '../services/pdf-service';
import { TemplateService } from '../services/template-service';
// RelatoriosReportService e DashboardReportService importados dinamicamente para evitar dependência circular
import { RelatorioCacheService } from '../services/relatorio-cache-service';
import { S3Service } from '../s3-service';

/**
 * Helper para obter repositoryFactory de forma lazy
 * Evita dependências circulares durante o build
 */
function getRepositoryFactoryLazy() {
  // Usar importação dinâmica apenas quando necessário
  try {
    return require('../repositories/repository-factory').repositoryFactory;
  } catch {
    // Fallback para importação estática se require falhar
    const mod = require('../repositories/repository-factory');
    return mod.repositoryFactory || mod.default?.repositoryFactory;
  }
}

/**
 * Factory que inicializa serviços com dependências injetadas
 * Todos os serviços recebem suas dependências via construtor
 * Mantém compatibilidade com código existente
 */
export class ServiceFactory {
  private static instance: ServiceFactory;

  // Serviços principais (inicializados lazy)
  private planoService?: PlanoService;
  private assinaturaService?: AssinaturaService;
  private funcionalidadeService?: FuncionalidadeService;
  private hotmartWebhookService?: HotmartWebhookService;
  private googleCalendarService?: GoogleCalendarService;
  private googleCalendarSyncService?: GoogleCalendarSyncService;
  private contratoService?: ContratoService;
  private pdfService?: PDFService;
  private templateService?: TemplateService;
  private relatorioCacheService?: RelatorioCacheService;
  private s3Service?: S3Service;

  // Serviços singleton (já gerenciam sua própria instância)
  // Estes não são criados aqui, apenas expostos via getters

  private constructor() {
    // Usar lazy initialization para evitar dependências circulares
    // Os serviços serão inicializados quando solicitados pela primeira vez
  }


  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  // Métodos getter para serviços principais (síncronos, mas inicializam lazy)
  public getPlanoService(): PlanoService {
    if (!this.planoService) {
      const repoFactory = getRepositoryFactoryLazy();
      this.initializeServicesSync(repoFactory);
    }
    return this.planoService!;
  }

  private initializeServicesSync(repoFactory: any): void {
    if (this.planoService) return; // Já inicializado

    // Inicializar serviços com dependências do repositoryFactory
    this.assinaturaService = new AssinaturaService(
      repoFactory.getAssinaturaRepository(),
      repoFactory.getPlanoRepository(),
      repoFactory.getUserRepository()
    );

    this.planoService = new PlanoService(
      repoFactory.getPlanoRepository(),
      repoFactory.getFuncionalidadeRepository(),
      repoFactory.getAssinaturaRepository(),
      repoFactory.getUserRepository(),
      this.assinaturaService
    );

    this.funcionalidadeService = new FuncionalidadeService(
      repoFactory.getFuncionalidadeRepository(),
      repoFactory.getAssinaturaRepository(),
      repoFactory.getUserRepository(),
      repoFactory.getEventoRepository(),
      repoFactory.getClienteRepository(),
      this.assinaturaService
    );

    this.hotmartWebhookService = new HotmartWebhookService(
      repoFactory.getAssinaturaRepository(),
      repoFactory.getPlanoRepository(),
      repoFactory.getUserRepository(),
      this.planoService,
      this.assinaturaService
    );

    this.googleCalendarService = new GoogleCalendarService();
    this.googleCalendarSyncService = new GoogleCalendarSyncService();
    this.contratoService = new ContratoService();
    this.pdfService = new PDFService();
    this.templateService = new TemplateService();
    this.relatorioCacheService = new RelatorioCacheService();
    this.s3Service = new S3Service();
  }

  public getAssinaturaService(): AssinaturaService {
    if (!this.assinaturaService) {
      this.getPlanoService(); // Inicializa todos os serviços
    }
    return this.assinaturaService!;
  }

  public getFuncionalidadeService(): FuncionalidadeService {
    if (!this.funcionalidadeService) {
      this.getPlanoService(); // Inicializa todos os serviços
    }
    return this.funcionalidadeService!;
  }

  public getHotmartWebhookService(): HotmartWebhookService {
    if (!this.hotmartWebhookService) {
      this.getPlanoService(); // Inicializa todos os serviços
    }
    return this.hotmartWebhookService!;
  }

  public getGoogleCalendarService(): GoogleCalendarService {
    if (!this.googleCalendarService) {
      this.getPlanoService(); // Inicializa todos os serviços
    }
    return this.googleCalendarService!;
  }

  public getGoogleCalendarSyncService(): GoogleCalendarSyncService {
    if (!this.googleCalendarSyncService) {
      this.getPlanoService(); // Inicializa todos os serviços
    }
    return this.googleCalendarSyncService!;
  }

  public getContratoService(): ContratoService {
    if (!this.contratoService) {
      this.getPlanoService(); // Inicializa todos os serviços
    }
    return this.contratoService!;
  }

  public getPDFService(): PDFService {
    if (!this.pdfService) {
      this.getPlanoService(); // Inicializa todos os serviços
    }
    return this.pdfService!;
  }

  public getTemplateService(): TemplateService {
    if (!this.templateService) {
      this.getPlanoService(); // Inicializa todos os serviços
    }
    return this.templateService!;
  }

  public getRelatorioCacheService(): RelatorioCacheService {
    if (!this.relatorioCacheService) {
      this.getPlanoService(); // Inicializa todos os serviços
    }
    return this.relatorioCacheService!;
  }

  public getS3Service(): S3Service {
    if (!this.s3Service) {
      this.getPlanoService(); // Inicializa todos os serviços
    }
    return this.s3Service!;
  }

  // Métodos getter para serviços singleton
  // Estes serviços já gerenciam sua própria instância
  // Usar importação dinâmica para evitar dependência circular
  public getRelatoriosReportService(): any {
    try {
      const { RelatoriosReportService } = require('../services/relatorios-report-service');
      return RelatoriosReportService.getInstance();
    } catch (error) {
      console.error('[ServiceFactory] Erro ao inicializar RelatoriosReportService:', error);
      throw error;
    }
  }

  public getDashboardReportService(): any {
    try {
      const { DashboardReportService } = require('../services/dashboard-report-service');
      return DashboardReportService.getInstance();
    } catch (error) {
      console.error('[ServiceFactory] Erro ao inicializar DashboardReportService:', error);
      throw error;
    }
  }
}

// Exportar função getter para evitar inicialização prematura
export function getServiceFactory(): ServiceFactory {
  return ServiceFactory.getInstance();
}

