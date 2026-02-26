import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { BaseRepository } from '../base-repository';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Repository base para Supabase
 * Implementa a interface BaseRepository usando Supabase
 */
export abstract class BaseSupabaseRepository<T extends { id: string }> implements BaseRepository<T> {
  protected tableName: string;
  protected supabase: SupabaseClient<Database>;
  protected useAdmin: boolean;

  constructor(
    tableName: string,
    supabase?: SupabaseClient<Database>,
    useAdmin: boolean = false
  ) {
    // Validar se Supabase está configurado
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase não está configurado. ' +
        'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente.'
      );
    }

    this.tableName = tableName;
    // Se não passar supabase, usar o helper
    this.supabase = supabase || getSupabaseClient(useAdmin);
    this.useAdmin = useAdmin;
  }

  /**
   * Converte dados do Supabase (snake_case) para formato da aplicação (camelCase)
   */
  protected abstract convertFromSupabase(row: any): T;

  /**
   * Converte dados da aplicação (camelCase) para formato do Supabase (snake_case)
   */
  protected abstract convertToSupabase(entity: Partial<T>): any;

  /**
   * Cria um novo registro
   */
  async create(entity: Omit<T, 'id'>): Promise<T> {
    const supabaseData = this.convertToSupabase(entity as Partial<T>);
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar ${this.tableName}: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  /**
   * Busca um registro por ID
   * Nota: Este método deve ser sobrescrito por repositórios que precisam de userId
   * Implementação base para repositórios que não precisam filtrar por userId (como ModeloContrato)
   */
  async findById(id: string, userId?: string): Promise<T | null> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        // Registro não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar ${this.tableName}: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  /**
   * Busca todos os registros
   * Nota: Este método deve ser sobrescrito por repositórios que precisam de userId
   * Não implementado na base porque a maioria dos repositórios Supabase precisa filtrar por userId
   * Repositórios que não precisam de userId (como ModeloContrato) podem implementar findAll() sem parâmetros
   */
  // findAll não implementado na base - cada repositório implementa sua própria versão conforme necessário

  /**
   * Atualiza um registro
   */
  async update(id: string, entity: Partial<T>): Promise<T> {
    const supabaseData = this.convertToSupabase(entity);
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar ${this.tableName}: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  /**
   * Deleta um registro
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Busca registros com filtro
   */
  async findWhere(field: string, operator: any, value: any): Promise<T[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*');

    // Converter operador do Firestore para Supabase
    switch (operator) {
      case '==':
        query = query.eq(field, value);
        break;
      case '!=':
        query = query.neq(field, value);
        break;
      case '>':
        query = query.gt(field, value);
        break;
      case '>=':
        query = query.gte(field, value);
        break;
      case '<':
        query = query.lt(field, value);
        break;
      case '<=':
        query = query.lte(field, value);
        break;
      case 'in':
        query = query.in(field, value);
        break;
      default:
        throw new Error(`Operador ${operator} não suportado`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar ${this.tableName}: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  /**
   * Busca com múltiplos filtros e ordenação
   */
  async query(
    filters?: Array<{ field: string; operator: any; value: any }>,
    orderBy?: { field: string; direction: 'asc' | 'desc' },
    limit?: number
  ): Promise<T[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*');

    // Aplicar filtros
    if (filters) {
      filters.forEach(filter => {
        switch (filter.operator) {
          case '==':
            query = query.eq(filter.field, filter.value);
            break;
          case '!=':
            query = query.neq(filter.field, filter.value);
            break;
          case '>':
            query = query.gt(filter.field, filter.value);
            break;
          case '>=':
            query = query.gte(filter.field, filter.value);
            break;
          case '<':
            query = query.lt(filter.field, filter.value);
            break;
          case '<=':
            query = query.lte(filter.field, filter.value);
            break;
          case 'in':
            query = query.in(filter.field, filter.value);
            break;
        }
      });
    }

    // Aplicar ordenação
    if (orderBy) {
      query = query.order(orderBy.field, { ascending: orderBy.direction === 'asc' });
    }

    // Aplicar limite
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar ${this.tableName}: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }
}

