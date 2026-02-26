# Step-by-Step: Correção de Problemas com Clientes e RLS

## Data: 2025-01-XX

## Problemas Identificados

1. **Clientes aparecem na contagem mas não na lista**
   - Contagem mostra 2 clientes
   - Lista de ativos/arquivados está vazia

2. **Ainda está usando subcollection do Firestore**
   - Erro mostra tentativa de acesso a subcollection
   - Deveria estar usando Supabase

3. **Erro RLS para canais_entrada**
   - Mesmo problema de RLS que tipos_servico e tipos_evento

## Correções Implementadas

### 1. Correção do método `getAtivos` para Clientes

**Arquivo**: `src/lib/repositories/supabase/cliente-supabase-repository.ts`

**Problema**: O método estava usando `arquivado != true`, mas isso não incluía valores NULL. No Supabase, precisamos usar `OR` para incluir NULL explicitamente.

**Solução**:
```typescript
async getAtivos(userId: string): Promise<Cliente[]> {
  const { data, error } = await this.supabase
    .from(this.tableName)
    .select('*')
    .eq('user_id', userId)
    .or('arquivado.is.null,arquivado.eq.false')
    .order('data_cadastro', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar clientes ativos: ${error.message}`);
  }

  return (data || []).map(row => this.convertFromSupabase(row));
}
```

**Mudança**: Substituído o método `query()` com filtro `!=` por query direta usando `.or('arquivado.is.null,arquivado.eq.false')` que inclui:
- Clientes com `arquivado = NULL` (clientes novos/nunca arquivados)
- Clientes com `arquivado = false` (clientes explicitamente não arquivados)

### 2. Criação de API Route para Canais de Entrada

**Arquivo**: `src/app/api/init/canais-entrada/route.ts`

**Função**: Mesma solução RLS aplicada para tipos_servico e tipos_evento

**Características**:
- Verifica autenticação via NextAuth
- Usa cliente admin do Supabase para contornar RLS
- Cria 3 canais padrão: "instagram", "indicação", "outros"
- Compatível com Firebase e Supabase

### 3. Modificação do DataService para Canais de Entrada

**Arquivo**: `src/lib/data-service.ts`

**Método modificado**: `ensureCanaisEntradaInitialized()`

**Alterações**:
1. Detecta se está usando Supabase + cliente (navegador)
2. Chama API route `/api/init/canais-entrada` automaticamente quando detectado
3. Fallback para método direto se API route falhar
4. Tratamento especial para erros de RLS

## Sobre o Problema do Subcollection

O erro mostra que ainda está tentando acessar subcollection do Firestore. Isso pode acontecer por:

1. **Variável de ambiente não configurada**: `NEXT_PUBLIC_USE_SUPABASE` pode não estar como `true`
2. **Cache do navegador**: O código antigo pode estar em cache
3. **Algum código instanciando repositório diretamente**: Ao invés de usar o factory

**Solução recomendada**:
- Verificar `.env.local` se tem `NEXT_PUBLIC_USE_SUPABASE=true`
- Limpar cache do navegador
- Reiniciar servidor Next.js

## Como Testar

1. **Verificar clientes aparecem na lista**:
   - Acesse `/clientes`
   - Verifique se os 2 clientes aparecem na aba "Ativos"
   - Teste também a aba "Arquivados"

2. **Verificar canais de entrada**:
   - Os erros de RLS para `canais_entrada` devem desaparecer
   - Canais padrão devem ser criados automaticamente

3. **Verificar logs**:
   - Console do navegador não deve mostrar erros de RLS
   - Console do servidor deve mostrar uso de Supabase

## Arquivos Modificados

1. `src/lib/repositories/supabase/cliente-supabase-repository.ts`
   - Método `getAtivos()` corrigido para incluir NULL

2. `src/app/api/init/canais-entrada/route.ts`
   - Novo arquivo criado

3. `src/lib/data-service.ts`
   - Método `ensureCanaisEntradaInitialized()` modificado para usar API route

## Próximos Passos

1. ⏳ Testar a aplicação e verificar se os problemas foram resolvidos
2. ⏳ Verificar variáveis de ambiente se ainda estiver usando Firestore
3. ⏳ Configurar políticas RLS adequadas no Supabase (se necessário)













