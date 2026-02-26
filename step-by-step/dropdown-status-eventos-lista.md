# Dropdown de Status na Lista de Eventos

## Problema Identificado

Na página `/eventos`, precisávamos facilitar a manipulação do status dos eventos. O problema era que para alterar o status, era necessário abrir a página de detalhes do evento, o que tornava o processo lento e trabalhoso.

**Objetivo**: Permitir alterar o status diretamente na lista de eventos através de um dropdown, sem precisar abrir a página de detalhes.

## Solução Implementada

### Estratégia
- **Dropdown sempre visível**: Select/Combobox no topo direito de cada card
- **Atualização otimista**: UI atualiza imediatamente, revertendo em caso de erro
- **Feedback visual**: Loading durante atualização e toast de sucesso/erro
- **Sem queries extras**: Usa enum `StatusEvento` já existente, não busca do banco

## Arquivos Criados/Modificados

### 1. Componente EventoStatusSelect
**Arquivo**: `src/components/EventoStatusSelect.tsx` (NOVO)

**Funcionalidade**:
- Componente Select customizado para alterar status do evento
- Exibe loading durante atualização
- Mantém cores do status (mesmas do badge anterior)
- Previne cliques durante atualização
- Usa enum `StatusEvento` para opções (sem buscar do banco)

**Características**:
- **Loading state**: Mostra spinner e texto "Atualizando..." durante atualização
- **Cores por status**: Mantém as mesmas cores do badge anterior para consistência visual
- **Desabilitado durante loading**: Previne múltiplas atualizações simultâneas
- **Callback assíncrono**: Recebe função `onStatusChange` que retorna Promise

**Código chave**:
```typescript
const handleChange = async (novoStatus: string) => {
  if (novoStatus === statusAtual || loading || disabled) {
    return;
  }

  setLoading(true);
  try {
    await onStatusChange(eventoId, novoStatus);
  } catch (error) {
    // Erro já é tratado no componente pai (reversão otimista)
    console.error('Erro ao atualizar status:', error);
  } finally {
    setLoading(false);
  }
};
```

### 2. Função handleStatusChange
**Arquivo**: `src/app/eventos/page.tsx`

**Funcionalidade**:
- Atualização otimista: muda UI imediatamente
- Atualiza no backend de forma assíncrona
- Reverte mudança em caso de erro
- Mostra toast de sucesso/erro
- Atualiza apenas o evento alterado na lista local

**Fluxo**:
1. Encontra evento na lista atual
2. Salva status anterior para possível reversão
3. Atualiza estado local imediatamente (otimista)
4. Chama `dataService.updateEvento()` no backend
5. Em caso de sucesso: mostra toast de sucesso
6. Em caso de erro: reverte mudança e mostra toast de erro

**Código chave**:
```typescript
const handleStatusChange = async (eventoId: string, novoStatus: string) => {
  // ... validações
  
  const statusAnterior = evento.status;
  const novoStatusTyped = novoStatus as Evento['status'];

  // Atualização otimista
  const atualizarEventoLocal = (eventos: Evento[] | null) => {
    if (!eventos) return eventos;
    return eventos.map(e => 
      e.id === eventoId ? { ...e, status: novoStatusTyped } : e
    );
  };

  if (abaAtiva === 'ativos') {
    setEventosLocais(prev => atualizarEventoLocal(prev));
  } else {
    setEventosArquivadosLocais(prev => atualizarEventoLocal(prev));
  }

  // Atualizar no backend
  try {
    await dataService.updateEvento(eventoId, { status: novoStatusTyped }, userId);
    showToast('Status atualizado com sucesso!', 'success');
  } catch (error) {
    // Reverter em caso de erro
    const reverterEvento = (eventos: Evento[] | null) => {
      if (!eventos) return eventos;
      return eventos.map(e => 
        e.id === eventoId ? { ...e, status: statusAnterior } : e
      );
    };

    if (abaAtiva === 'ativos') {
      setEventosLocais(prev => reverterEvento(prev));
    } else {
      setEventosArquivadosLocais(prev => reverterEvento(prev));
    }

    showToast('Erro ao atualizar status do evento', 'error');
    throw error;
  }
};
```

### 3. Reposicionamento no Card
**Arquivo**: `src/app/eventos/page.tsx`

**Modificações**:
1. **Adicionado no CardHeader** (topo direito):
   ```typescript
   <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
     <EventoStatusSelect
       eventoId={evento.id}
       statusAtual={evento.status}
       onStatusChange={handleStatusChange}
     />
   </div>
   ```

2. **Removido badge de status** da parte inferior do card (onde estava antes)

3. **Prevenção de propagação**: `onClick={(e) => e.stopPropagation()}` evita que o clique no dropdown abra a página de detalhes

**Estrutura do CardHeader**:
```typescript
<CardHeader>
  <div className="flex flex-col gap-2">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-4">
      {/* Título e descrição à esquerda */}
      <div className="min-w-0 flex-1">
        <CardTitle>...</CardTitle>
        <CardDescription>...</CardDescription>
      </div>
      {/* Status Select à direita */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <EventoStatusSelect ... />
      </div>
    </div>
  </div>
</CardHeader>
```

### 4. Opções de Status
**Arquivo**: `src/components/EventoStatusSelect.tsx`

**Uso do enum StatusEvento**:
- Não busca status do banco de dados
- Usa enum `StatusEvento` já existente em `src/types/index.ts`
- Opções hardcoded no componente:
  ```typescript
  const statusOptions = [
    { value: StatusEvento.AGENDADO, label: 'Agendado' },
    { value: StatusEvento.CONFIRMADO, label: 'Confirmado' },
    { value: StatusEvento.EM_ANDAMENTO, label: 'Em andamento' },
    { value: StatusEvento.CONCLUIDO, label: 'Concluído' },
    { value: StatusEvento.CANCELADO, label: 'Cancelado' }
  ];
  ```

## Benefícios da Solução

### UX (Experiência do Usuário)
- **Rapidez**: Alterar status sem abrir página de detalhes
- **Feedback imediato**: UI atualiza instantaneamente (otimista)
- **Feedback visual**: Loading e toast informam o status da operação
- **Consistência**: Mantém cores e estilo do badge anterior

### Performance
- **Sem queries extras**: Usa enum, não busca do banco
- **Atualização local**: Apenas o evento alterado é atualizado na lista
- **Não recarrega lista**: Mantém estado local, não faz refetch completo

### Manutenibilidade
- **Componente reutilizável**: `EventoStatusSelect` pode ser usado em outras páginas
- **Separação de responsabilidades**: Lógica de atualização separada da UI
- **Type-safe**: Usa enum TypeScript para garantir valores válidos

## Fluxo de Dados

```
1. Usuário clica no dropdown de status
   ↓
2. Seleciona novo status
   ↓
3. EventoStatusSelect chama handleChange
   ↓
4. handleChange mostra loading e chama onStatusChange
   ↓
5. handleStatusChange (página) atualiza estado local (otimista)
   ↓
6. handleStatusChange chama dataService.updateEvento()
   ↓
7. Backend atualiza no Supabase
   ↓
8. Sucesso: Toast de sucesso, loading desaparece
   Erro: Reverte mudança, toast de erro, loading desaparece
```

## Considerações Técnicas

### Atualização Otimista
- **Vantagem**: UI responde instantaneamente, melhor UX
- **Desvantagem**: Pode precisar reverter em caso de erro
- **Solução**: Salvamos status anterior e revertemos se necessário

### Prevenção de Cliques
- **stopPropagation**: Previne que clique no dropdown abra página de detalhes
- **disabled durante loading**: Previne múltiplas atualizações simultâneas

### Tratamento de Erros
- **Reversão automática**: Se backend falhar, UI volta ao status anterior
- **Feedback claro**: Toast de erro informa o usuário
- **Logging**: Erro é logado no console para debug

### Validações
- **Sem restrições**: Qualquer status pode ser alterado para qualquer outro
- **Sem confirmação**: Mudança é aplicada imediatamente (pode ser adicionado no futuro)

## Possíveis Melhorias Futuras

1. **Confirmação para status críticos**: Pedir confirmação ao mudar para "Cancelado"
2. **Histórico de mudanças**: Registrar quem e quando alterou o status
3. **Notificações**: Notificar interessados quando status mudar
4. **Validações de transição**: Impedir transições inválidas (ex: "Concluído" → "Agendado")
5. **Bulk update**: Permitir alterar status de múltiplos eventos de uma vez

## Testes Recomendados

1. **Teste de atualização**: Verificar que status muda corretamente
2. **Teste de erro**: Simular erro de rede e verificar reversão
3. **Teste de loading**: Verificar que loading aparece durante atualização
4. **Teste de toast**: Verificar que toast aparece em sucesso/erro
5. **Teste de propagação**: Verificar que clique no dropdown não abre página de detalhes

## Conclusão

A solução implementada permite alterar o status dos eventos diretamente na lista, melhorando significativamente a produtividade do usuário. A atualização otimista garante uma experiência fluida, enquanto o tratamento de erros mantém a consistência dos dados.

