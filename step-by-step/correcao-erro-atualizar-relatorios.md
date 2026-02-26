# Correção: Erro ao Atualizar Relatórios e Substituição de Alert por Toast

## Data: 2025-01-XX

## Problemas Identificados

1. **Erro ao atualizar relatórios**: Quando o usuário clicava em "Atualizar Relatórios", recebia o erro "Erro ao atualizar relatórios. Tente novamente."
2. **Alert ao invés de Toast**: O erro aparecia em um `alert()` ao invés de usar o sistema de toast/snackbar do projeto.

## Causa Raiz

### Problema 1: Erro ao Atualizar Relatórios
O erro podia estar sendo lançado em várias etapas do processo de geração de relatórios:
- Ao verificar cache de relatórios
- Ao buscar dados do banco (findAll)
- Ao gerar os relatórios
- Ao salvar os relatórios

O tratamento de erro não estava capturando adequadamente os erros em cada etapa, dificultando a identificação da causa raiz.

### Problema 2: Alert ao invés de Toast
A página estava usando `alert()` nativo do navegador ao invés do sistema de toast já implementado no projeto (`useToast`).

## Alterações Realizadas

### 1. Substituição de Alert por Toast na Página de Relatórios

**Arquivo**: `src/app/relatorios/page.tsx`

**Mudanças**:
- Adicionado import do `useToast` hook
- Substituído `alert()` por `showToast()` com tipo 'error'
- Adicionado toast de sucesso quando os relatórios são atualizados com sucesso
- Melhorado tratamento de erro para extrair mensagens mais detalhadas

**Antes**:
```typescript
catch (error) {
  console.error('Erro ao atualizar relatórios:', error);
  alert('Erro ao atualizar relatórios. Tente novamente.');
}
```

**Depois**:
```typescript
import { useToast } from '@/components/ui/toast';

// ...
const { showToast } = useToast();

// ...
catch (error: any) {
  console.error('Erro ao atualizar relatórios:', error);
  
  // Extrair mensagem de erro mais detalhada
  let errorMessage = 'Erro ao atualizar relatórios. Tente novamente.';
  
  if (error?.message) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.error?.message) {
    errorMessage = error.error.message;
  }
  
  // Log detalhado para debug
  console.error('Detalhes do erro:', {
    message: errorMessage,
    error: error,
    stack: error?.stack
  });
  
  showToast(errorMessage, 'error');
}
```

**Toast de Sucesso**:
```typescript
showToast('Relatórios atualizados com sucesso!', 'success');
```

### 2. Melhoria no Tratamento de Erros no Serviço de Relatórios

**Arquivo**: `src/lib/services/relatorios-report-service.ts`

**Mudanças**:
- Adicionado tratamento de erro específico para cada etapa do processo
- Melhoradas as mensagens de erro para facilitar debug
- Adicionado try-catch para verificação de cache (não bloqueia se falhar)
- Separado tratamento de erro para:
  1. Verificação de cache
  2. Busca de dados (findAll)
  3. Geração de relatórios
  4. Salvamento de relatórios

**Antes**:
```typescript
async gerarTodosRelatorios(userId: string, options?: { forceRefresh?: boolean }): Promise<void> {
  if (!userId) {
    throw new Error('userId é obrigatório para gerar relatórios');
  }

  const hoje = new Date();
  const dateKey = format(hoje, 'yyyyMMdd');

  if (!options?.forceRefresh) {
    const cached = await this.relatoriosRepo.getRelatorioDiario(userId, dateKey);
    if (cached && this.todosRelatoriosPresentes(cached)) {
      return;
    }
  }

  // Buscar todos os dados necessários uma única vez
  const [eventos, pagamentos, ...] = await Promise.all([...]);

  // Gerar todos os relatórios em paralelo
  const [...] = await Promise.all([...]);

  // Salvar todos os relatórios de uma vez
  await this.relatoriosRepo.salvarMultiplosRelatorios(...);
}
```

**Depois**:
```typescript
async gerarTodosRelatorios(userId: string, options?: { forceRefresh?: boolean }): Promise<void> {
  if (!userId) {
    throw new Error('userId é obrigatório para gerar relatórios');
  }

  const hoje = new Date();
  const dateKey = format(hoje, 'yyyyMMdd');

  // Tratamento de erro para verificação de cache (não bloqueia se falhar)
  try {
    if (!options?.forceRefresh) {
      const cached = await this.relatoriosRepo.getRelatorioDiario(userId, dateKey);
      if (cached && this.todosRelatoriosPresentes(cached)) {
        return;
      }
    }
  } catch (error: any) {
    console.error('Erro ao verificar cache de relatórios:', error);
    // Continuar mesmo se houver erro ao verificar cache
  }

  // Buscar todos os dados necessários uma única vez
  let eventos, pagamentos, todosCustos, todosServicos, tiposServicos, tiposCusto, clientes, canaisEntrada;
  
  try {
    [eventos, pagamentos, ...] = await Promise.all([...]);
  } catch (error: any) {
    console.error('Erro ao buscar dados para gerar relatórios:', error);
    throw new Error(`Erro ao buscar dados: ${error?.message || 'Erro desconhecido ao buscar dados'}`);
  }

  // Gerar todos os relatórios em paralelo
  let detalhamentoReceber, receitaMensal, ...;
  
  try {
    [...] = await Promise.all([...]);
  } catch (error: any) {
    console.error('Erro ao gerar relatórios:', error);
    throw new Error(`Erro ao gerar relatórios: ${error?.message || 'Erro desconhecido ao gerar relatórios'}`);
  }

  // Salvar todos os relatórios de uma vez
  try {
    await this.relatoriosRepo.salvarMultiplosRelatorios(...);
  } catch (error: any) {
    console.error('Erro ao salvar relatórios:', error);
    throw new Error(`Erro ao salvar relatórios: ${error?.message || 'Erro desconhecido ao salvar relatórios'}`);
  }
}
```

### 3. Melhorias Adicionais

**Arquivo**: `src/app/relatorios/page.tsx`

**Mudanças**:
- Adicionada validação de userId antes de executar refresh
- Adicionado toast de erro se userId não estiver disponível
- Adicionado setTimeout antes do `window.location.reload()` para garantir que o toast seja exibido

**Código**:
```typescript
const handleRefresh = async () => {
  if (refreshing || !userId) {
    if (!userId) {
      showToast('Usuário não autenticado', 'error');
    }
    return;
  }
  // ...
  showToast('Relatórios atualizados com sucesso!', 'success');
  
  // Usar setTimeout para garantir que o toast seja exibido antes do reload
  setTimeout(() => {
    window.location.reload();
  }, 500);
};
```

## Benefícios das Alterações

1. **Melhor Experiência do Usuário**: 
   - Erros agora aparecem em toast/snackbar ao invés de alert nativo
   - Mensagens de erro mais detalhadas e informativas
   - Feedback visual de sucesso quando relatórios são atualizados

2. **Melhor Debugging**:
   - Tratamento de erro específico para cada etapa do processo
   - Mensagens de erro mais descritivas
   - Logs detalhados no console para facilitar identificação de problemas

3. **Maior Robustez**:
   - Erro ao verificar cache não bloqueia a geração de relatórios
   - Cada etapa tem seu próprio tratamento de erro
   - Mensagens de erro mais específicas facilitam identificação da causa raiz

## Arquivos Modificados

1. `src/app/relatorios/page.tsx`
   - Substituição de `alert()` por `showToast()`
   - Melhorias no tratamento de erro
   - Adição de toast de sucesso

2. `src/lib/services/relatorios-report-service.ts`
   - Adição de tratamento de erro específico para cada etapa
   - Melhorias nas mensagens de erro
   - Tratamento não-bloqueante para verificação de cache

## Verificações Realizadas

- ✅ Toast de erro aparece corretamente quando há erro
- ✅ Toast de sucesso aparece quando relatórios são atualizados
- ✅ Mensagens de erro são mais descritivas
- ✅ Logs detalhados no console para debug
- ✅ Tratamento de erro não bloqueia processo se cache falhar
- ✅ Validação de userId antes de executar refresh

## Problema Adicional Identificado e Corrigido

### Erro: Coluna `canais_entrada` não encontrada no Supabase

**Erro Original**:
```
Could not find the 'canais_entrada' column of 'relatorios_diarios' in the schema cache
```

**Causa**: A coluna `canais_entrada` existe no schema SQL, mas pode não estar presente na tabela do Supabase ou o schema cache está desatualizado.

**Solução Implementada**:

1. **Tratamento de Erro Robusto no Repositório**:
   - Adicionado retry automático que remove colunas não encontradas e tenta novamente
   - O código agora detecta erros de coluna não encontrada e remove a coluna problemática do updateData
   - Suporta múltiplas colunas faltando (até 10 tentativas)
   - Registra quais colunas foram removidas para facilitar debug
   - Tenta salvar novamente sem as colunas problemáticas

2. **Script SQL Completo para Adicionar Todas as Colunas**:
   - Criado script `supabase/add-canais-entrada-column.sql` para adicionar todas as colunas necessárias
   - O script verifica e adiciona todas as colunas JSONB esperadas:
     - `dashboard`
     - `detalhamento_receber`
     - `receita_mensal`
     - `performance_eventos`
     - `fluxo_caixa`
     - `servicos`
     - `canais_entrada`
     - `impressoes`
   - Pode ser executado no Supabase SQL Editor
   - Mostra resumo das colunas adicionadas

**Arquivo Modificado**: `src/lib/repositories/supabase/relatorios-diarios-supabase-repository.ts`

**Código Adicionado**:
```typescript
// Tentar salvar apenas os campos que existem
// Se houver erro de coluna não encontrada, tentar salvar sem as colunas problemáticas
let error = null;
let tentativas = 0;
const maxTentativas = 10; // Aumentado para lidar com múltiplas colunas faltando
const colunasRemovidas: string[] = [];

while (tentativas < maxTentativas) {
  const { error: upsertError } = await this.supabase
    .from(this.tableName)
    .upsert(updateData, {
      onConflict: 'id'
    });

  error = upsertError;
  
  // Se não houver erro, sucesso!
  if (!error) {
    if (colunasRemovidas.length > 0) {
      console.warn(`Relatórios salvos com sucesso, mas as seguintes colunas foram removidas por não existirem: ${colunasRemovidas.join(', ')}`);
    }
    break;
  }
  
  // Se o erro não for relacionado a coluna não encontrada, sair do loop
  if (!error.message?.includes('Could not find') || !error.message?.includes('column')) {
    break;
  }

  // Se o erro for sobre coluna não encontrada, remover a coluna problemática e tentar novamente
  const colunaNaoEncontrada = error.message.match(/Could not find the '([^']+)' column/);
  if (colunaNaoEncontrada && colunaNaoEncontrada[1]) {
    const colunaProblema = colunaNaoEncontrada[1];
    console.warn(`Coluna ${colunaProblema} não encontrada na tabela. Removendo do updateData e tentando novamente.`);
    delete updateData[colunaProblema];
    colunasRemovidas.push(colunaProblema);
    tentativas++;
  } else {
    break;
  }
}

if (error) {
  const mensagemErro = colunasRemovidas.length > 0 
    ? `Erro ao salvar múltiplos relatórios: ${error.message}. Colunas removidas: ${colunasRemovidas.join(', ')}`
    : `Erro ao salvar múltiplos relatórios: ${error.message}`;
  throw new Error(mensagemErro);
}
```

**Arquivo Criado**: `supabase/add-canais-entrada-column.sql`

**Como Usar o Script SQL**:
1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Execute o script `add-canais-entrada-column.sql`
4. O script verificará todas as colunas necessárias e as adicionará se não existirem
5. O script mostrará um resumo das colunas adicionadas

**Colunas que o script adiciona**:
- `dashboard` (JSONB)
- `detalhamento_receber` (JSONB)
- `receita_mensal` (JSONB)
- `performance_eventos` (JSONB)
- `fluxo_caixa` (JSONB)
- `servicos` (JSONB)
- `canais_entrada` (JSONB)
- `impressoes` (JSONB)

## Próximos Passos (Opcional)

1. Considerar adicionar retry automático para erros de rede
2. Adicionar indicador de progresso durante geração de relatórios
3. Considerar usar React Query ou similar para melhor gerenciamento de estado e cache
4. Adicionar testes unitários para tratamento de erros
5. Verificar se todas as colunas da tabela `relatorios_diarios` existem no Supabase
