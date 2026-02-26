export interface MigrationResult {
  success: boolean;
  message: string;
  migratedCount: number;
  errors: string[];
}

export class MigrationService {
  async migrateToSubcollections(): Promise<MigrationResult> {
    return {
      success: false,
      message: 'Migração desabilitada - agora usa subcollections. Use a página de migração em /admin/migration.',
      migratedCount: 0,
      errors: ['Serviço de migração desabilitado']
    };
  }
}

export const migrationService = new MigrationService();