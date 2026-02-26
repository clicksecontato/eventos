# Plano de Implementação: Página de Valores Atrasados

**Data**: 2025-01-24  
**Objetivo**: Criar uma página dedicada para exibir valores atrasados por evento, com filtros e navegação direta para os eventos.

---

## 🎯 PROBLEMA ATUAL

1. No dashboard (`/painel`), o bloco "Valores Atrasados" mostra apenas:
   - Quantidade de eventos com valores atrasados
   - Valor total atrasado
   - Ao clicar, redireciona para `/relatorios` (não específico)

2. **Falta**: Visualização detalhada de:
   - Quais eventos estão atrasados
   - Valor atrasado de cada evento
   - Informações relevantes (cliente, data do evento, data de vencimento)
   - Filtros para facilitar busca
   - Navegação direta para o evento

---

## 📊 ANÁLISE DE ALTERNATIVAS

### Opção 1: Tabela Separada com Atualização Diária (Sugestão Original)

**Estrutura**:
- Tabela `valores_atrasados` no banco
- Job/cron diário para atualizar
- Consulta rápida (apenas SELECT)

**Prós**:
- ✅ Performance excelente (consulta instantânea)
- ✅ Baixo custo de leitura
- ✅ Escalável para muitos usuários

**Contras**:
- ❌ Dados podem ficar desatualizados (até 24h)
- ❌ Complexidade adicional (job, monitoramento)
- ❌ Custo de escrita diária (mas baixo)
- ❌ Se evento for pago, só atualiza no próximo dia

**Custo Estimado**:
- Escrita: ~1 query por usuário/dia = ~30 queries/mês por usuário
- Leitura: 1 query por acesso = muito baixo

---

### Opção 2: Consulta em Tempo Real Otimizada (Recomendada)

**Estrutura**:
- Query SQL otimizada com índices
- Cache em memória (Next.js) por sessão
- Atualização sob demanda

**Prós**:
- ✅ Dados sempre atualizados
- ✅ Sem necessidade de jobs/cron
- ✅ Menos complexidade
- ✅ Atualiza imediatamente quando pagamento é registrado

**Contras**:
- ⚠️ Query pode ser mais lenta (mas otimizada)
- ⚠️ Requer índices adequados

**Custo Estimado**:
- Leitura: 1 query por acesso (com cache de sessão)
- Escrita: 0 (usa dados existentes)

---

### Opção 3: Híbrido - Cache com Atualização Sob Demanda

**Estrutura**:
- Tabela de cache `valores_atrasados_cache`
- Atualização automática quando:
  - Pagamento é criado/atualizado
  - Evento é modificado
  - Usuário acessa a página (se cache > 1h)
- Cache expira após 1 hora

**Prós**:
- ✅ Balance entre performance e atualização
- ✅ Dados atualizados quando necessário
- ✅ Performance boa (cache)

**Contras**:
- ⚠️ Complexidade média (triggers ou hooks)
- ⚠️ Requer lógica de invalidação

**Custo Estimado**:
- Escrita: ~5-10 queries/mês por usuário (apenas quando há mudanças)
- Leitura: 1 query por acesso (com cache)

---

## ✅ DECISÃO: Opção 2 (Consulta Otimizada em Tempo Real)

**Justificativa**:
1. **Simplicidade**: Não requer jobs, triggers ou lógica complexa
2. **Atualização**: Dados sempre corretos
3. **Performance**: Com índices adequados, query é rápida
4. **Custo**: Apenas leitura (baixo)
5. **Manutenção**: Menos código = menos bugs

**Otimizações**:
- Índices em `eventos.dia_final_pagamento` e `eventos.arquivado`
- Índices em `pagamentos.evento_id` e `pagamentos.status`
- Query com JOIN otimizado
- Cache em memória (Next.js) por 5 minutos por usuário

---

## 📋 PLANO DE IMPLEMENTAÇÃO

### FASE 1: Estrutura de Dados e Query Otimizada

#### 1.1 Verificar/Criar Índices Necessários

**Arquivo**: `supabase/schema.sql` ou nova migration

```sql
-- Índices para otimizar query de valores atrasados
CREATE INDEX IF NOT EXISTS idx_eventos_dia_final_pagamento_atrasado 
  ON eventos(user_id, dia_final_pagamento) 
  WHERE arquivado = false AND valor_total > 0;

CREATE INDEX IF NOT EXISTS idx_pagamentos_evento_status 
  ON pagamentos(evento_id, status) 
  WHERE cancelado = false;
```

**Justificativa**: 
- Filtra eventos não arquivados com valor
- Acelera busca de pagamentos por evento e status

---

#### 1.2 Criar View Materializada (Opcional - para performance extra)

**Arquivo**: `supabase/migrations/create_view_valores_atrasados.sql`

```sql
-- View materializada para valores atrasados
CREATE MATERIALIZED VIEW IF NOT EXISTS valores_atrasados_view AS
SELECT 
  e.id AS evento_id,
  e.user_id,
  e.nome_evento,
  e.data_evento,
  e.dia_final_pagamento,
  e.valor_total,
  e.cliente_id,
  c.nome AS cliente_nome,
  c.email AS cliente_email,
  c.telefone AS cliente_telefone,
  COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'Pago' AND NOT p.cancelado), 0) AS total_pago,
  e.valor_total - COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'Pago' AND NOT p.cancelado), 0) AS valor_atrasado,
  CURRENT_DATE - DATE(e.dia_final_pagamento) AS dias_atraso
FROM eventos e
INNER JOIN clientes c ON e.cliente_id = c.id
LEFT JOIN pagamentos p ON p.evento_id = e.id
WHERE 
  e.arquivado = false
  AND e.valor_total > 0
  AND e.dia_final_pagamento IS NOT NULL
  AND e.dia_final_pagamento < CURRENT_DATE
GROUP BY e.id, e.user_id, e.nome_evento, e.data_evento, e.dia_final_pagamento, 
         e.valor_total, e.cliente_id, c.nome, c.email, c.telefone
HAVING e.valor_total - COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'Pago' AND NOT p.cancelado), 0) > 0;

-- Índice na view
CREATE UNIQUE INDEX IF NOT EXISTS idx_valores_atrasados_view_evento 
  ON valores_atrasados_view(evento_id);

CREATE INDEX IF NOT EXISTS idx_valores_atrasados_view_user 
  ON valores_atrasados_view(user_id);

-- Função para atualizar a view (chamar quando necessário)
CREATE OR REPLACE FUNCTION refresh_valores_atrasados_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY valores_atrasados_view;
END;
$$ LANGUAGE plpgsql;
```

**Nota**: View materializada oferece performance máxima, mas requer atualização manual ou via trigger. Para simplicidade inicial, podemos começar sem view e adicionar depois se necessário.

---

### FASE 2: Backend - Service e Repository

#### 2.1 Criar Interface TypeScript

**Arquivo**: `src/types/index.ts`

```typescript
export interface ValorAtrasado {
  eventoId: string;
  nomeEvento: string;
  dataEvento: Date;
  diaFinalPagamento: Date;
  valorTotal: number;
  totalPago: number;
  valorAtrasado: number;
  diasAtraso: number;
  cliente: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
  };
  evento?: Evento; // Opcional, para detalhes completos
}

export interface ValoresAtrasadosFiltros {
  clienteId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  diasAtrasoMin?: number;
  diasAtrasoMax?: number;
  valorMin?: number;
  valorMax?: number;
  ordenarPor?: 'valorAtrasado' | 'diasAtraso' | 'dataEvento' | 'diaFinalPagamento' | 'clienteNome';
  ordem?: 'asc' | 'desc';
  limite?: number;
  offset?: number;
}
```

---

#### 2.2 Criar Repository

**Arquivo**: `src/lib/repositories/supabase/valores-atrasados-supabase-repository.ts`

```typescript
import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ValorAtrasado, ValoresAtrasadosFiltros } from '@/types';

export class ValoresAtrasadosSupabaseRepository {
  private tableName = 'eventos';
  private supabase = getSupabaseClient();

  /**
   * Busca valores atrasados para um usuário
   * Query otimizada com JOIN e agregação
   */
  async findValoresAtrasados(
    userId: string,
    filtros?: ValoresAtrasadosFiltros
  ): Promise<ValorAtrasado[]> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Query base: eventos com valores atrasados
    let query = this.supabase
      .from(this.tableName)
      .select(`
        id,
        nome_evento,
        data_evento,
        dia_final_pagamento,
        valor_total,
        cliente_id,
        clientes!inner(
          id,
          nome,
          email,
          telefone
        ),
        pagamentos(
          valor,
          status,
          cancelado
        )
      `)
      .eq('user_id', userId)
      .eq('arquivado', false)
      .gt('valor_total', 0)
      .not('dia_final_pagamento', 'is', null)
      .lt('dia_final_pagamento', hoje.toISOString());

    // Aplicar filtros
    if (filtros?.clienteId) {
      query = query.eq('cliente_id', filtros.clienteId);
    }

    if (filtros?.dataInicio) {
      query = query.gte('data_evento', filtros.dataInicio.toISOString());
    }

    if (filtros?.dataFim) {
      query = query.lte('data_evento', filtros.dataFim.toISOString());
    }

    if (filtros?.valorMin) {
      query = query.gte('valor_total', filtros.valorMin);
    }

    if (filtros?.valorMax) {
      query = query.lte('valor_total', filtros.valorMax);
    }

    // Ordenação
    const ordenarPor = filtros?.ordenarPor || 'diaFinalPagamento';
    const ordem = filtros?.ordem || 'asc';

    const orderByMap: Record<string, string> = {
      valorAtrasado: 'valor_total',
      diasAtraso: 'dia_final_pagamento',
      dataEvento: 'data_evento',
      diaFinalPagamento: 'dia_final_pagamento',
      clienteNome: 'clientes.nome'
    };

    if (orderByMap[ordenarPor]) {
      query = query.order(orderByMap[ordenarPor], { ascending: ordem === 'asc' });
    }

    // Limite e offset
    if (filtros?.limite) {
      query = query.limit(filtros.limite);
    }

    if (filtros?.offset) {
      query = query.range(filtros.offset, filtros.offset + (filtros.limite || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar valores atrasados: ${error.message}`);
    }

    // Processar resultados: calcular valores atrasados
    const valoresAtrasados: ValorAtrasado[] = (data || [])
      .map((row: any) => {
        const pagamentos = row.pagamentos || [];
        const totalPago = pagamentos
          .filter((p: any) => p.status === 'Pago' && !p.cancelado)
          .reduce((sum: number, p: any) => sum + p.valor, 0);

        const valorAtrasado = row.valor_total - totalPago;

        // Filtrar apenas eventos com valor atrasado > 0
        if (valorAtrasado <= 0) {
          return null;
        }

        const diaFinalPagamento = new Date(row.dia_final_pagamento);
        const diasAtraso = Math.floor((hoje.getTime() - diaFinalPagamento.getTime()) / (1000 * 60 * 60 * 24));

        // Aplicar filtro de dias de atraso se especificado
        if (filtros?.diasAtrasoMin !== undefined && diasAtraso < filtros.diasAtrasoMin) {
          return null;
        }

        if (filtros?.diasAtrasoMax !== undefined && diasAtraso > filtros.diasAtrasoMax) {
          return null;
        }

        return {
          eventoId: row.id,
          nomeEvento: row.nome_evento,
          dataEvento: new Date(row.data_evento),
          diaFinalPagamento: diaFinalPagamento,
          valorTotal: row.valor_total,
          totalPago,
          valorAtrasado,
          diasAtraso,
          cliente: {
            id: row.cliente_id,
            nome: row.clientes.nome,
            email: row.clientes.email,
            telefone: row.clientes.telefone
          }
        };
      })
      .filter((v: ValorAtrasado | null) => v !== null) as ValorAtrasado[];

    // Ordenação final (se necessário, após cálculos)
    if (ordenarPor === 'valorAtrasado' || ordenarPor === 'diasAtraso') {
      valoresAtrasados.sort((a, b) => {
        const aVal = ordenarPor === 'valorAtrasado' ? a.valorAtrasado : a.diasAtraso;
        const bVal = ordenarPor === 'valorAtrasado' ? b.valorAtrasado : b.diasAtraso;
        return ordem === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return valoresAtrasados;
  }

  /**
   * Conta total de valores atrasados (para paginação)
   */
  async countValoresAtrasados(
    userId: string,
    filtros?: ValoresAtrasadosFiltros
  ): Promise<number> {
    const valores = await this.findValoresAtrasados(userId, filtros);
    return valores.length;
  }
}
```

---

#### 2.3 Criar Service

**Arquivo**: `src/lib/services/valores-atrasados-service.ts`

```typescript
import { ValorAtrasado, ValoresAtrasadosFiltros } from '@/types';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

export class ValoresAtrasadosService {
  private repository = repositoryFactory.getValoresAtrasadosRepository();

  /**
   * Busca valores atrasados com filtros
   */
  async buscarValoresAtrasados(
    userId: string,
    filtros?: ValoresAtrasadosFiltros
  ): Promise<ValorAtrasado[]> {
    return this.repository.findValoresAtrasados(userId, filtros);
  }

  /**
   * Conta total de valores atrasados
   */
  async contarValoresAtrasados(
    userId: string,
    filtros?: ValoresAtrasadosFiltros
  ): Promise<number> {
    return this.repository.countValoresAtrasados(userId, filtros);
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
}
```

---

#### 2.4 Registrar Repository no Factory

**Arquivo**: `src/lib/repositories/repository-factory.ts`

```typescript
// Adicionar import
import { ValoresAtrasadosSupabaseRepository } from './supabase/valores-atrasados-supabase-repository';

// Adicionar propriedade
private valoresAtrasadosRepository: ValoresAtrasadosSupabaseRepository;

// Adicionar no construtor
this.valoresAtrasadosRepository = new ValoresAtrasadosSupabaseRepository();

// Adicionar método getter
public getValoresAtrasadosRepository(): ValoresAtrasadosSupabaseRepository {
  return this.valoresAtrasadosRepository;
}
```

---

### FASE 3: API Route

#### 3.1 Criar API Route

**Arquivo**: `src/app/api/valores-atrasados/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { ValoresAtrasadosService } from '@/lib/services/valores-atrasados-service';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  getQueryParams
} from '@/lib/api/route-helpers';
import { ValoresAtrasadosFiltros } from '@/types';

const valoresAtrasadosService = new ValoresAtrasadosService();

/**
 * GET /api/valores-atrasados
 * Busca valores atrasados com filtros opcionais
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const params = getQueryParams(request);

    // Construir filtros
    const filtros: ValoresAtrasadosFiltros = {};

    if (params.clienteId) {
      filtros.clienteId = params.clienteId;
    }

    if (params.dataInicio) {
      filtros.dataInicio = new Date(params.dataInicio);
    }

    if (params.dataFim) {
      filtros.dataFim = new Date(params.dataFim);
    }

    if (params.diasAtrasoMin) {
      filtros.diasAtrasoMin = parseInt(params.diasAtrasoMin);
    }

    if (params.diasAtrasoMax) {
      filtros.diasAtrasoMax = parseInt(params.diasAtrasoMax);
    }

    if (params.valorMin) {
      filtros.valorMin = parseFloat(params.valorMin);
    }

    if (params.valorMax) {
      filtros.valorMax = parseFloat(params.valorMax);
    }

    if (params.ordenarPor) {
      filtros.ordenarPor = params.ordenarPor as any;
    }

    if (params.ordem) {
      filtros.ordem = params.ordem as 'asc' | 'desc';
    }

    if (params.limite) {
      filtros.limite = parseInt(params.limite);
    }

    if (params.offset) {
      filtros.offset = parseInt(params.offset);
    }

    // Buscar valores atrasados
    const valores = await valoresAtrasadosService.buscarValoresAtrasados(user.id, filtros);
    const resumo = await valoresAtrasadosService.calcularResumo(user.id);

    return createApiResponse({
      valores,
      resumo,
      total: valores.length
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

### FASE 4: Frontend - Página e Componentes

#### 4.1 Criar Hook para Valores Atrasados

**Arquivo**: `src/hooks/useValoresAtrasados.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { ValorAtrasado, ValoresAtrasadosFiltros } from '@/types';
import { useCurrentUser } from './useAuth';

interface UseValoresAtrasadosResult {
  valores: ValorAtrasado[];
  resumo: {
    totalEventos: number;
    valorTotalAtrasado: number;
    mediaDiasAtraso: number;
    maiorValorAtrasado: number;
  } | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useValoresAtrasados(
  filtros?: ValoresAtrasadosFiltros
): UseValoresAtrasadosResult {
  const [valores, setValores] = useState<ValorAtrasado[]>([]);
  const [resumo, setResumo] = useState<UseValoresAtrasadosResult['resumo']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filtros?.clienteId) params.append('clienteId', filtros.clienteId);
      if (filtros?.dataInicio) params.append('dataInicio', filtros.dataInicio.toISOString());
      if (filtros?.dataFim) params.append('dataFim', filtros.dataFim.toISOString());
      if (filtros?.diasAtrasoMin !== undefined) params.append('diasAtrasoMin', filtros.diasAtrasoMin.toString());
      if (filtros?.diasAtrasoMax !== undefined) params.append('diasAtrasoMax', filtros.diasAtrasoMax.toString());
      if (filtros?.valorMin !== undefined) params.append('valorMin', filtros.valorMin.toString());
      if (filtros?.valorMax !== undefined) params.append('valorMax', filtros.valorMax.toString());
      if (filtros?.ordenarPor) params.append('ordenarPor', filtros.ordenarPor);
      if (filtros?.ordem) params.append('ordem', filtros.ordem);
      if (filtros?.limite) params.append('limite', filtros.limite.toString());
      if (filtros?.offset) params.append('offset', filtros.offset.toString());

      const response = await fetch(`/api/valores-atrasados?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar valores atrasados');
      }

      const result = await response.json();
      const data = result.data || result;

      setValores(data.valores || []);
      setResumo(data.resumo || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar valores atrasados');
    } finally {
      setLoading(false);
    }
  }, [userId, filtros]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { valores, resumo, loading, error, refetch: fetchData };
}
```

---

#### 4.2 Criar Página de Valores Atrasados

**Arquivo**: `src/app/valores-atrasados/page.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useValoresAtrasados } from '@/hooks/useValoresAtrasados';
import { ValoresAtrasadosFiltros } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ExclamationTriangleIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

export default function ValoresAtrasadosPage() {
  const router = useRouter();
  const [filtros, setFiltros] = useState<ValoresAtrasadosFiltros>({
    ordenarPor: 'diaFinalPagamento',
    ordem: 'asc'
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const { valores, resumo, loading, error, refetch } = useValoresAtrasados(filtros);

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const handleFiltroChange = (campo: keyof ValoresAtrasadosFiltros, valor: any) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limparFiltros = () => {
    setFiltros({
      ordenarPor: 'diaFinalPagamento',
      ordem: 'asc'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Carregando valores atrasados...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-error">Erro: {error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-error" />
              Valores Atrasados
            </h1>
            <p className="text-text-secondary mt-1">
              Eventos com valores vencidos que precisam de atenção
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Resumo */}
        {resumo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">Total de Eventos</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {resumo.totalEventos}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">Valor Total Atrasado</p>
                <p className="text-2xl font-bold text-error mt-1">
                  {formatarValor(resumo.valorTotalAtrasado)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">Média de Dias em Atraso</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {resumo.mediaDiasAtraso} dias
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">Maior Valor Atrasado</p>
                <p className="text-2xl font-bold text-error mt-1">
                  {formatarValor(resumo.maiorValorAtrasado)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        {mostrarFiltros && (
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Ordenar por
                  </label>
                  <select
                    value={filtros.ordenarPor || 'diaFinalPagamento'}
                    onChange={(e) => handleFiltroChange('ordenarPor', e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="diaFinalPagamento">Data de Vencimento</option>
                    <option value="valorAtrasado">Valor Atrasado</option>
                    <option value="diasAtraso">Dias em Atraso</option>
                    <option value="dataEvento">Data do Evento</option>
                    <option value="clienteNome">Nome do Cliente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Ordem
                  </label>
                  <select
                    value={filtros.ordem || 'asc'}
                    onChange={(e) => handleFiltroChange('ordem', e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="asc">Crescente</option>
                    <option value="desc">Decrescente</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={limparFiltros} className="w-full">
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Valores Atrasados */}
        {valores.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary">Nenhum valor atrasado encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {valores.map((valor) => (
              <Card
                key={valor.eventoId}
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => router.push(`/eventos/${valor.eventoId}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-text-primary">
                          {valor.nomeEvento}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-error/10 text-error rounded">
                          {valor.diasAtraso} {valor.diasAtraso === 1 ? 'dia' : 'dias'} atrasado
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-text-secondary">Cliente</p>
                          <p className="text-base font-medium text-text-primary mt-1">
                            {valor.cliente.nome}
                          </p>
                          {valor.cliente.telefone && (
                            <p className="text-xs text-text-muted mt-1">
                              {valor.cliente.telefone}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-text-secondary">Data do Evento</p>
                          <p className="text-base font-medium text-text-primary mt-1">
                            {format(valor.dataEvento, 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-xs text-text-muted mt-1">
                            Vencimento: {format(valor.diaFinalPagamento, 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-text-secondary">Valores</p>
                          <div className="mt-1">
                            <p className="text-base font-medium text-text-primary">
                              Total: {formatarValor(valor.valorTotal)}
                            </p>
                            <p className="text-sm text-text-secondary">
                              Pago: {formatarValor(valor.totalPago)}
                            </p>
                            <p className="text-lg font-bold text-error">
                              Atrasado: {formatarValor(valor.valorAtrasado)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/eventos/${valor.eventoId}`);
                      }}
                      className="ml-4"
                    >
                      Ver Evento
                      <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
```

---

#### 4.3 Atualizar Dashboard para Redirecionar Corretamente

**Arquivo**: `src/app/dashboard/page.tsx`

```typescript
// Alterar linha 293
<Card 
  onClick={() => router.push('/valores-atrasados')}
  className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
>
```

---

### FASE 5: Otimizações e Melhorias Futuras

#### 5.1 Cache em Memória (Opcional)

Adicionar cache simples em memória no service para evitar queries repetidas na mesma sessão:

```typescript
// No service
private cache: Map<string, { data: ValorAtrasado[]; timestamp: number }> = new Map();
private CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async buscarValoresAtrasados(userId: string, filtros?: ValoresAtrasadosFiltros) {
  const cacheKey = `${userId}_${JSON.stringify(filtros)}`;
  const cached = this.cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    return cached.data;
  }
  
  const data = await this.repository.findValoresAtrasados(userId, filtros);
  this.cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

---

#### 5.2 View Materializada (Opcional - se performance for crítica)

Se a query ficar lenta com muitos eventos, implementar a view materializada da Fase 1.2 e atualizar via trigger quando:
- Pagamento é criado/atualizado
- Evento é modificado

---

## 📊 ESTIMATIVA DE CUSTOS

### Consulta Otimizada (Opção Escolhida)
- **Leitura**: ~1 query por acesso à página
- **Escrita**: 0 (usa dados existentes)
- **Custo mensal por usuário**: ~30 queries/mês (assumindo 1 acesso/dia)
- **Custo total**: Muito baixo

### Comparação com Tabela Separada
- **Leitura**: ~1 query por acesso (mesmo)
- **Escrita**: ~30 queries/mês (job diário)
- **Custo mensal por usuário**: ~60 queries/mês
- **Custo total**: Baixo, mas maior que opção escolhida

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] FASE 1: Criar índices no banco
- [ ] FASE 2.1: Criar interfaces TypeScript
- [ ] FASE 2.2: Criar repository
- [ ] FASE 2.3: Criar service
- [ ] FASE 2.4: Registrar no factory
- [ ] FASE 3: Criar API route
- [ ] FASE 4.1: Criar hook
- [ ] FASE 4.2: Criar página
- [ ] FASE 4.3: Atualizar dashboard
- [ ] Testes: Verificar performance
- [ ] Testes: Verificar filtros
- [ ] Testes: Verificar navegação

---

## 🎯 RESULTADO ESPERADO

1. **Página dedicada** (`/valores-atrasados`) com:
   - Lista de eventos com valores atrasados
   - Informações relevantes (cliente, datas, valores)
   - Filtros para busca
   - Resumo estatístico
   - Navegação direta para cada evento

2. **Performance**: Query rápida (< 500ms) mesmo com muitos eventos

3. **Atualização**: Dados sempre corretos (sem delay de cache)

4. **Custo**: Baixo (apenas leitura)

---

## 🔄 MELHORIAS FUTURAS (Opcional)

1. **Exportação**: Botão para exportar lista em CSV/PDF
2. **Notificações**: Alertas quando novos valores ficam atrasados
3. **Gráficos**: Visualização de tendências de valores atrasados
4. **Ações em lote**: Marcar múltiplos eventos para cobrança
5. **Histórico**: Ver histórico de valores atrasados por período

---

## 📝 NOTAS

- A solução escolhida (consulta otimizada) é a mais simples e eficiente para o caso de uso
- Se no futuro a performance se tornar um problema, podemos migrar para view materializada
- A página pode ser expandida com mais funcionalidades conforme necessário
- Considerar adicionar paginação se houver muitos valores atrasados
