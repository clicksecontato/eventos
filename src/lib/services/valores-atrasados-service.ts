import { ValorAtrasado, ValoresAtrasadosFiltros } from '@/types';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

export class ValoresAtrasadosService {
  private repository = repositoryFactory.getValoresAtrasadosRepository();
  private cache: Map<string, { data: ValorAtrasado[]; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca valores atrasados com filtros
   * Usa cache em memória para evitar queries repetidas na mesma sessão
   */
  async buscarValoresAtrasados(
    userId: string,
    filtros?: ValoresAtrasadosFiltros
  ): Promise<ValorAtrasado[]> {
    // Gerar chave de cache baseada em userId e filtros
    const cacheKey = `${userId}_${JSON.stringify(filtros || {})}`;
    const cached = this.cache.get(cacheKey);
    
    // Verificar se cache é válido
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    
    // Buscar dados do repository
    const data = await this.repository.findValoresAtrasados(userId, filtros);
    
    // Atualizar cache
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  }

  /**
   * Conta total de valores atrasados
   */
  async contarValoresAtrasados(
    userId: string,
    filtros?: ValoresAtrasadosFiltros
  ): Promise<number> {
    const valores = await this.buscarValoresAtrasados(userId, filtros);
    return valores.length;
  }

  /**
   * Calcula resumo de valores atrasados
   */
  async calcularResumo(userId: string): Promise<{
    totalEventos: number;
    valorTotalAtrasado: number;
    mediaDiasAtraso: number;
    maiorValorAtrasado: number;
  }> {
    const valores = await this.buscarValoresAtrasados(userId);

    if (valores.length === 0) {
      return {
        totalEventos: 0,
        valorTotalAtrasado: 0,
        mediaDiasAtraso: 0,
        maiorValorAtrasado: 0
      };
    }

    const valorTotalAtrasado = valores.reduce((sum, v) => sum + v.valorAtrasado, 0);
    const mediaDiasAtraso = valores.reduce((sum, v) => sum + v.diasAtraso, 0) / valores.length;
    const maiorValorAtrasado = Math.max(...valores.map(v => v.valorAtrasado));

    return {
      totalEventos: valores.length,
      valorTotalAtrasado,
      mediaDiasAtraso: Math.round(mediaDiasAtraso),
      maiorValorAtrasado
    };
  }

  /**
   * Limpa cache (útil para forçar atualização)
   */
  limparCache(userId?: string): void {
    if (userId) {
      // Limpar apenas cache do usuário específico
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.startsWith(`${userId}_`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      // Limpar todo o cache
      this.cache.clear();
    }
  }
}
