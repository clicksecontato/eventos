# Correção de Timezone na Data de Pagamento

**Data**: 2025-01-XX  
**Problema**: Ao adicionar um novo pagamento, a data exibida no histórico estava um dia antes da data informada no formulário.

---

## 🎯 PROBLEMA IDENTIFICADO

Quando um pagamento era criado com uma data específica (ex: 15/01/2025), o sistema exibia a data como 14/01/2025 no histórico de pagamentos.

### Causa Raiz

O problema ocorreu devido a um erro comum de timezone no JavaScript:

1. O formulário usa um input do tipo `date` que retorna uma string no formato `"yyyy-MM-dd"` (ex: `"2025-01-15"`)
2. Quando criamos `new Date("2025-01-15")`, o JavaScript interpreta como **UTC à meia-noite** (`2025-01-15T00:00:00Z`)
3. Quando convertemos para o timezone local (ex: UTC-3), a data vira `2025-01-14T21:00:00-03:00`
4. Ao formatar para exibição, mostra `14/01/2025` em vez de `15/01/2025`

**Exemplo**:
```javascript
// ❌ ERRADO - Interpreta como UTC
new Date("2025-01-15")
// Resultado: 2025-01-15T00:00:00Z (UTC)
// Em UTC-3: 2025-01-14T21:00:00-03:00
// Ao formatar: 14/01/2025 ❌

// ✅ CORRETO - Cria no timezone local
parseLocalDate("2025-01-15")
// Resultado: 2025-01-15T00:00:00-03:00 (timezone local)
// Ao formatar: 15/01/2025 ✅
```

---

## ✅ SOLUÇÃO IMPLEMENTADA

Criamos uma função helper que converte strings de data para objetos Date no timezone local, não em UTC.

### 1. Função Helper para Conversão de Data

**Arquivo**: `src/lib/utils/date-helpers.ts`

Criamos a função `parseLocalDate()` que:
- Recebe uma string no formato `"yyyy-MM-dd"`
- Cria um objeto Date usando os componentes de ano, mês e dia separadamente
- Garante que a data seja criada no timezone local, não em UTC

**Código**:
```typescript
export function parseLocalDate(dateString: string): Date {
  const parts = dateString.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexed
  const day = parseInt(parts[2], 10);
  
  // Criar Date no timezone local
  return new Date(year, month, day, 0, 0, 0, 0);
}
```

### 2. Atualização do PagamentoForm

**Arquivo**: `src/components/forms/PagamentoForm.tsx`

**Antes**:
```typescript
dataPagamento: new Date(formData.dataPagamento), // ❌ Interpreta como UTC
```

**Depois**:
```typescript
import { parseLocalDate } from '@/lib/utils/date-helpers';

dataPagamento: parseLocalDate(formData.dataPagamento), // ✅ Timezone local
```

### 3. Atualização do EventoForm

**Arquivo**: `src/components/forms/EventoForm.tsx`

Também corrigimos o mesmo problema para datas de eventos e dia final de pagamento:

**Antes**:
```typescript
dataEvento: new Date(formData.dataEvento + 'T00:00:00'), // ❌
diaFinalPagamento: new Date(formData.diaFinalPagamento), // ❌
```

**Depois**:
```typescript
import { parseLocalDate } from '@/lib/utils/date-helpers';

dataEvento: parseLocalDate(formData.dataEvento), // ✅
diaFinalPagamento: parseLocalDate(formData.diaFinalPagamento), // ✅
```

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### Arquivos Criados

1. **`src/lib/utils/date-helpers.ts`**
   - Função `parseLocalDate()`: Converte string "yyyy-MM-dd" para Date no timezone local
   - Função `formatLocalDate()`: Converte Date para string "yyyy-MM-dd" no timezone local

### Arquivos Modificados

1. **`src/components/forms/PagamentoForm.tsx`**
   - Adicionado import de `parseLocalDate`
   - Alterado `new Date(formData.dataPagamento)` para `parseLocalDate(formData.dataPagamento)`

2. **`src/components/forms/EventoForm.tsx`**
   - Adicionado import de `parseLocalDate`
   - Alterado `new Date(formData.dataEvento + 'T00:00:00')` para `parseLocalDate(formData.dataEvento)`
   - Alterado `new Date(formData.diaFinalPagamento)` para `parseLocalDate(formData.diaFinalPagamento)`

---

## 🔧 COMO FUNCIONA

### Fluxo de Criação de Pagamento

1. **Usuário preenche formulário**:
   - Seleciona data: `15/01/2025` no input date
   - Input retorna: `"2025-01-15"`

2. **Antes da correção**:
   ```javascript
   new Date("2025-01-15")
   // → 2025-01-15T00:00:00Z (UTC)
   // → Em UTC-3: 2025-01-14T21:00:00-03:00
   // → Exibição: 14/01/2025 ❌
   ```

3. **Depois da correção**:
   ```javascript
   parseLocalDate("2025-01-15")
   // → 2025-01-15T00:00:00-03:00 (timezone local)
   // → Exibição: 15/01/2025 ✅
   ```

### Por que funciona?

A função `parseLocalDate()` usa o construtor `new Date(year, month, day)` que:
- Cria a data no timezone local do navegador
- Não interpreta como UTC
- Mantém a data exata que o usuário selecionou

---

## 🎯 RESULTADO ESPERADO

Após esta correção:
- ✅ A data exibida no histórico corresponde exatamente à data informada no formulário
- ✅ Não há mais diferença de um dia entre a data informada e a data exibida
- ✅ O problema também foi corrigido para eventos e dia final de pagamento

---

## 🔍 VERIFICAÇÃO

Para verificar se está funcionando:

1. **Criar um novo pagamento**:
   - Acessar um evento
   - Adicionar novo pagamento
   - Selecionar uma data (ex: 15/01/2025)
   - Salvar

2. **Verificar no histórico**:
   - A data exibida deve ser exatamente a mesma que foi selecionada
   - Não deve haver diferença de um dia

---

## 📝 NOTAS TÉCNICAS

### Por que `new Date("2025-01-15")` é problemático?

- O formato `"yyyy-MM-dd"` é interpretado como UTC pela especificação ISO 8601
- Isso causa problemas em timezones negativos (como UTC-3 do Brasil)
- A solução é usar o construtor `new Date(year, month, day)` que cria no timezone local

### Por que não usar `new Date("2025-01-15T00:00:00")`?

- Ainda seria interpretado como UTC se não especificar o timezone
- `new Date("2025-01-15T00:00:00-03:00")` funcionaria, mas requer saber o timezone
- A solução com `parseLocalDate()` é mais simples e funciona em qualquer timezone

### Compatibilidade

- A função funciona em qualquer timezone
- Não depende de configurações específicas
- Funciona tanto no cliente quanto no servidor (se necessário)

---

## 🚀 PRÓXIMOS PASSOS

1. Testar em diferentes timezones (se aplicável)
2. Verificar se há outros lugares no código com o mesmo problema
3. Considerar usar a função `parseLocalDate()` em outros formulários que usam input date

---

## 📚 REFERÊNCIAS

- [MDN - Date Constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date)
- [ISO 8601 Date Format](https://en.wikipedia.org/wiki/ISO_8601)
- [JavaScript Date Timezone Issues](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#time_value_range)

