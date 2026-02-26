# Exibição de Tipos de Serviços na Lista de Eventos

## Problema Identificado

Na página `/eventos`, precisávamos exibir os tipos de serviços selecionados em cada evento. O problema era que buscar os tipos de serviços para cada evento individualmente na lista tornava a pesquisa muito onerosa, especialmente com ~1000 eventos.

**Problema original**: N queries (uma por evento) = ~1000 queries ao carregar a lista
**Solução implementada**: 1 query batch que busca todos os serviços de uma vez

## Solução Implementada

### Estratégia
- **Busca em lote (batch query)**: Uma única query busca todos os serviços dos eventos visíveis
- **Agrupamento no frontend**: Os serviços são agrupados por `eventoId` usando um `Map` para acesso O(1)
- **Otimização com memoização**: Componentes memoizados para evitar re-renders desnecessários

## Arquivos Criados/Modificados

### 1. Repository - Método de Busca em Lote
**Arquivo**: `src/lib/repositories/supabase/servico-evento-supabase-repository.ts`

**Método adicionado**: `findByEventoIds(userId: string, eventoIds: string[]): Promise<Map<string, ServicoEvento[]>>`

**Funcionalidade**:
- Aceita um array de IDs de eventos
- Divide em chunks de 1000 (limite do Supabase IN clause)
- Busca todos os serviços de uma vez com JOIN em `tipo_servicos`
- Filtra apenas serviços não removidos (`removido = false`)
- Retorna um `Map<eventoId, ServicoEvento[]>` para acesso rápido

**Código chave**:
```typescript
async findByEventoIds(userId: string, eventoIds: string[]): Promise<Map<string, ServicoEvento[]>> {
  // Divide em chunks de 1000
  const CHUNK_SIZE = 1000;
  const chunks: string[][] = [];
  
  for (let i = 0; i < eventoIds.length; i += CHUNK_SIZE) {
    chunks.push(eventoIds.slice(i, i + CHUNK_SIZE));
  }

  // Busca em lote com JOIN
  const { data, error } = await this.supabase
    .from(this.tableName)
    .select('*, tipo_servicos(*)')
    .eq('user_id', userId)
    .in('evento_id', chunk)
    .eq('removido', false)
    .order('data_cadastro', { ascending: false });

  // Agrupa por eventoId
  const servicosPorEvento = new Map<string, ServicoEvento[]>();
  allServicos.forEach(servico => {
    const existing = servicosPorEvento.get(servico.eventoId) || [];
    existing.push(servico);
    servicosPorEvento.set(servico.eventoId, existing);
  });

  return servicosPorEvento;
}
```

### 2. Data Service - Método Wrapper
**Arquivo**: `src/lib/data-service.ts`

**Método adicionado**: `getServicosPorEventos(userId: string, eventoIds: string[]): Promise<Map<string, ServicoEvento[]>>`

**Funcionalidade**:
- Wrapper que chama o método do repository
- Mantém a interface consistente com outros métodos do data-service

### 3. Hook Customizado
**Arquivo**: `src/hooks/useData.ts`

**Hook adicionado**: `useServicosPorEventos(eventoIds: string[])`

**Funcionalidade**:
- Hook React que busca serviços de múltiplos eventos
- Gerencia estado de loading e error
- Usa `useMemo` para criar dependência estável dos `eventoIds`
- Retorna `Map<eventoId, ServicoEvento[]>` para acesso rápido

**Código chave**:
```typescript
export function useServicosPorEventos(eventoIds: string[]): {
  servicosPorEvento: Map<string, ServicoEvento[]>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [servicosPorEvento, setServicosPorEvento] = useState<Map<string, ServicoEvento[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    // ... validações
    const result = await dataService.getServicosPorEventos(userId, eventoIds);
    setServicosPorEvento(result);
  }, [userId, eventoIds.join(',')]); // Dependência estável

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { servicosPorEvento, loading, error, refetch: fetchData };
}
```

### 4. Componente de Badges
**Arquivo**: `src/components/ServicosBadges.tsx` (NOVO)

**Funcionalidade**:
- Componente React memoizado para exibir tipos de serviços como badges/chips
- Filtra serviços removidos
- Remove duplicatas mantendo ordem
- Exibe todos os nomes sem truncar
- Retorna `null` se não houver serviços

**Características**:
- Memoizado com `React.memo` para evitar re-renders
- Usa `useMemo` para processar nomes de serviços
- Estilização com Tailwind CSS (badges com cor accent)

**Código chave**:
```typescript
const ServicosBadges = React.memo(function ServicosBadges({ servicos, className = '' }: ServicosBadgesProps) {
  const nomesServicos = React.useMemo(() => {
    const nomes = servicos
      .filter(servico => !servico.removido && servico.tipoServico?.nome)
      .map(servico => servico.tipoServico!.nome);
    
    return Array.from(new Set(nomes)); // Remove duplicatas
  }, [servicos]);

  if (nomesServicos.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {nomesServicos.map((nome, index) => (
        <span key={`${nome}-${index}`} className="...">
          {nome}
        </span>
      ))}
    </div>
  );
});
```

### 5. Integração na Página de Eventos
**Arquivo**: `src/app/eventos/page.tsx`

**Modificações**:
1. Import do hook e componente:
   ```typescript
   import { useServicosPorEventos } from '@/hooks/useData';
   import ServicosBadges from '@/components/ServicosBadges';
   ```

2. Extração de IDs dos eventos filtrados:
   ```typescript
   const eventoIds = useMemo(() => {
     return sortedEventos.map(evento => evento.id);
   }, [sortedEventos]);
   ```

3. Uso do hook para buscar serviços:
   ```typescript
   const { servicosPorEvento, loading: loadingServicos } = useServicosPorEventos(eventoIds);
   ```

4. Renderização dos badges no card de cada evento:
   ```typescript
   {!loadingServicos && (
     <div className="pt-2">
       <ServicosBadges 
         servicos={servicosPorEvento.get(evento.id) || []} 
         className="mt-2"
       />
     </div>
   )}
   ```

## Benefícios da Solução

### Performance
- **Redução de queries**: De ~1000 queries para 1 query (ou poucas se houver mais de 1000 eventos)
- **JOIN otimizado**: Supabase faz JOIN eficiente entre `servicos_evento` e `tipo_servicos`
- **Acesso rápido**: `Map` permite acesso O(1) aos serviços de cada evento

### Escalabilidade
- **Suporta muitos eventos**: Divide automaticamente em chunks de 1000
- **Memoização**: Evita re-renders e recálculos desnecessários
- **Lazy loading**: Só busca serviços dos eventos visíveis (após filtros)

### Manutenibilidade
- **Separação de responsabilidades**: Repository → Data Service → Hook → Component
- **Reutilizável**: Hook e componente podem ser usados em outras páginas
- **Type-safe**: TypeScript garante tipos corretos em toda a cadeia

## Fluxo de Dados

```
1. Página de Eventos carrega eventos
   ↓
2. Extrai IDs dos eventos filtrados
   ↓
3. Hook useServicosPorEventos recebe IDs
   ↓
4. Data Service chama Repository
   ↓
5. Repository faz query batch no Supabase
   ↓
6. Supabase retorna serviços com JOIN em tipo_servicos
   ↓
7. Repository agrupa por eventoId em Map
   ↓
8. Hook retorna Map para componente
   ↓
9. Componente EventosPage acessa serviços por evento
   ↓
10. ServicosBadges renderiza badges para cada evento
```

## Considerações Técnicas

### Limitações do Supabase
- Limite de 1000 itens no `IN` clause
- Solução: Divisão automática em chunks

### Otimizações Aplicadas
- **Memoização de componentes**: `React.memo` no `ServicosBadges`
- **Memoização de dados**: `useMemo` para processar nomes de serviços
- **Dependências estáveis**: `eventoIds.join(',')` no hook
- **Filtro no banco**: Apenas serviços não removidos são buscados

### Possíveis Melhorias Futuras
1. **Cache**: Implementar cache dos serviços para evitar re-buscar ao filtrar
2. **Virtualização**: Para listas muito grandes, usar virtualização de lista
3. **Paginação**: Se necessário, implementar paginação de serviços
4. **Filtro por serviços**: Adicionar filtro na lista de eventos por tipo de serviço

## Testes Recomendados

1. **Teste de performance**: Verificar tempo de carregamento com 1000+ eventos
2. **Teste de chunks**: Verificar comportamento com mais de 1000 eventos
3. **Teste de filtros**: Verificar que serviços são atualizados ao filtrar eventos
4. **Teste de memoização**: Verificar que componentes não re-renderizam desnecessariamente

## Conclusão

A solução implementada resolve o problema de performance ao buscar tipos de serviços na lista de eventos, transformando N queries em 1 query batch. A arquitetura é escalável, mantível e segue boas práticas do React e TypeScript.

