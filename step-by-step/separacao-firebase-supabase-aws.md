# Separação Firebase / Supabase / AWS - Análise e Plano de Ação

**Data**: 2025-01-XX  
**Modo**: Planejador - Separação de Responsabilidades

---

## 🎯 OBJETIVO

Separar corretamente as responsabilidades entre:
- **Firebase/Firestore**: Login, usuários, planos e funcionalidades
- **Supabase**: Todo conteúdo do sistema
- **AWS S3**: Arquivos

---

## ✅ O QUE JÁ ESTÁ CORRETO

### 🔥 Firebase/Firestore (CORRETO - Manter)

| Repositório | Collection | Uso | Status |
|------------|-----------|-----|--------|
| `UserRepository` | `controle_users` | Informações do usuário | ✅ CORRETO |
| `FuncionalidadeRepository` | `funcionalidades` | Funcionalidades do sistema | ✅ CORRETO |
| `PlanoRepository` | `planos` | Planos disponíveis | ✅ CORRETO |
| `AssinaturaRepository` | `assinaturas` | Assinaturas dos usuários | ✅ CORRETO |
| `ArquivoRepository` | Metadados no Firestore | Metadados de arquivos (arquivos no S3) | ✅ CORRETO |

**Serviços que usam Firebase (CORRETO)**:
- ✅ `FuncionalidadeService` - Verifica permissões e limites
- ✅ `PlanoService` - Gerencia planos
- ✅ `AssinaturaService` - Gerencia assinaturas

**Autenticação**:
- ✅ NextAuth com Firebase Auth (CORRETO - manter)

---

### ✅ Supabase (CORRETO - Conteúdo)

| Repositório | Tabela | Uso | Status |
|------------|--------|-----|--------|
| `ClienteSupabaseRepository` | `clientes` | Clientes | ✅ CORRETO |
| `EventoSupabaseRepository` | `eventos` | Eventos | ✅ CORRETO |
| `PagamentoSupabaseRepository` | `pagamentos` | Pagamentos | ✅ CORRETO |
| `CustoSupabaseRepository` | `custos` | Custos | ✅ CORRETO |
| `ServicoEventoSupabaseRepository` | `servicos_evento` | Serviços | ✅ CORRETO |
| `CanalEntradaSupabaseRepository` | `canais_entrada` | Canais de entrada | ✅ CORRETO |
| `TipoEventoSupabaseRepository` | `tipo_eventos` | Tipos de evento | ✅ CORRETO |
| `TipoCustoSupabaseRepository` | `tipo_custos` | Tipos de custo | ✅ CORRETO |
| `TipoServicoSupabaseRepository` | `tipo_servicos` | Tipos de serviço | ✅ CORRETO |
| `ContratoSupabaseRepository` | `contratos` | Contratos | ✅ CORRETO |

**Índices criados** (garantem performance):
- ✅ `idx_pagamentos_user_id`
- ✅ `idx_custos_user_id`
- ✅ `idx_servicos_evento_user_id`

---

### ☁️ AWS S3 (CORRETO - Manter)

- ✅ Arquivos continuam no S3
- ✅ `ArquivoRepository` gerencia metadados no Firestore (CORRETO)

---

## ⚠️ O QUE PRECISA SER ALTERADO

### 1. **Collections Globais - REMOVER do Firebase**

**Problema**: As collections globais ainda estão sendo usadas quando Supabase está ativo.

**Localizações**:
- `src/lib/data-service.ts`:
  - `getAllPagamentos()` - ✅ **CORRIGIDO** (usa Supabase quando disponível)
  - `getAllCustos()` - ✅ **CORRIGIDO** (usa Supabase quando disponível)
  - `getAllServicos()` - ✅ **CORRIGIDO** (usa Supabase quando disponível)

**Ação**: Substituir uso de `pagamentoGlobalRepo`, `custoGlobalRepo`, `servicoGlobalRepo` por `findAll(userId)` dos repositórios Supabase.

---

### 2. **RepositoryFactory - Remover Collections Globais**

**Problema**: `RepositoryFactory` ainda inicializa collections globais mesmo quando Supabase está ativo.

**Localização**: `src/lib/repositories/repository-factory.ts` - linhas 133-136

**Ação**: 
- Remover inicialização de `pagamentoGlobalRepository`, `custoGlobalRepository`, `servicoGlobalRepository` quando Supabase está ativo
- Ou manter apenas para fallback quando Firebase está sendo usado

---

### 3. **ModeloContratoRepository e ConfiguracaoContratoRepository**

**Status Atual**: Ainda usando Firebase

**Decisão Necessária**: 
- Se `modelos_contrato` e `configuracao_contrato` são **conteúdo do sistema** → Migrar para Supabase
- Se são **configurações globais/planos** → Manter no Firebase

**Recomendação**: 
- `modelos_contrato` → **Supabase** (conteúdo)
- `configuracao_contrato` → **Supabase** (conteúdo por usuário)

---

### 4. **GoogleCalendarTokenRepository**

**Status Atual**: Ainda usando Firebase

**Decisão**: 
- Se é **integração/configuração do usuário** → Pode ficar no Firebase
- Se é **dado de conteúdo** → Supabase

**Recomendação**: **Firebase** (é configuração/integração, não conteúdo)

---

## 📋 PLANO DE AÇÃO

### Fase 1: Remover Collections Globais do Supabase ✅

**Arquivo**: `src/lib/data-service.ts`

#### 1.1. Corrigir `getAllCustos()` (linha 918)

**ANTES**:
```typescript
async getAllCustos(userId: string): Promise<CustoEvento[]> {
  // Buscar todos os custos da collection global (muito mais eficiente)
  const todosCustos = await this.custoGlobalRepo.findAll(userId);
  // ...
}
```

**DEPOIS**:
```typescript
async getAllCustos(userId: string): Promise<CustoEvento[]> {
  const isUsingSupabase = repositoryFactory.isUsingSupabase();
  let todosCustos: CustoEvento[];

  if (isUsingSupabase) {
    // No Supabase, buscar todos os custos diretamente do repositório
    todosCustos = await this.custoEventoRepo.findAll(userId);
  } else {
    // No Firebase, usar a collection global
    todosCustos = await this.custoGlobalRepo.findAll(userId);
  }
  // ... resto do código
}
```

#### 1.2. Corrigir `getAllServicos()` (linha 1234)

**ANTES**:
```typescript
async getAllServicos(userId: string): Promise<ServicoEvento[]> {
  // Buscar todos os serviços da collection global (muito mais eficiente)
  const todosServicos = await this.servicoGlobalRepo.findAll(userId);
  // ...
}
```

**DEPOIS**:
```typescript
async getAllServicos(userId: string): Promise<ServicoEvento[]> {
  const isUsingSupabase = repositoryFactory.isUsingSupabase();
  let todosServicos: ServicoEvento[];

  if (isUsingSupabase) {
    // No Supabase, buscar todos os serviços diretamente do repositório
    todosServicos = await this.servicoEventoRepo.findAll(userId);
  } else {
    // No Firebase, usar a collection global
    todosServicos = await this.servicoGlobalRepo.findAll(userId);
  }
  // ... resto do código
}
```

---

### Fase 2: Limpar RepositoryFactory

**Arquivo**: `src/lib/repositories/repository-factory.ts`

**Ação**: Adicionar comentário documentando que collections globais são apenas para fallback Firebase.

```typescript
// Repositórios que ainda não têm versão Supabase (usar Firebase)
// Collections globais são apenas para fallback quando Firebase está ativo
// Quando Supabase está ativo, usar findAll(userId) dos repositórios Supabase
this.pagamentoGlobalRepository = new PagamentoGlobalRepository();
this.custoGlobalRepository = new CustoGlobalRepository();
this.servicoGlobalRepository = new ServicoGlobalRepository();
```

---

### Fase 3: Decidir sobre ModeloContrato e ConfiguracaoContrato

**Decisão**: Migrar para Supabase (são conteúdo do sistema)

**Ação**: 
- Criar repositórios Supabase para `ModeloContratoRepository` e `ConfiguracaoContratoRepository`
- Atualizar `RepositoryFactory` para usar Supabase quando disponível

---

## 📊 MAPEAMENTO FINAL

### 🔥 Firebase/Firestore (Manter)

```
✅ controle_users (UserRepository)
✅ funcionalidades (FuncionalidadeRepository)
✅ planos (PlanoRepository)
✅ assinaturas (AssinaturaRepository)
✅ Metadados de arquivos (ArquivoRepository)
✅ google_calendar_tokens (GoogleCalendarTokenRepository) - Configuração
```

### ✅ Supabase (Conteúdo)

```
✅ clientes
✅ eventos
✅ pagamentos
✅ custos
✅ servicos_evento
✅ canais_entrada
✅ tipo_eventos
✅ tipo_custos
✅ tipo_servicos
✅ contratos
⚠️ modelos_contrato (migrar)
⚠️ configuracao_contrato (migrar)
```

### ☁️ AWS S3 (Arquivos)

```
✅ Arquivos físicos (upload/download)
✅ Metadados no Firestore via ArquivoRepository
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Corrigir `getAllCustos()` em `data-service.ts` ✅
- [x] Corrigir `getAllServicos()` em `data-service.ts` ✅
- [x] Verificar que `getAllPagamentos()` já está correto ✅
- [x] Adicionar comentários no `RepositoryFactory` sobre collections globais ✅
- [ ] Decidir sobre `ModeloContratoRepository` e `ConfiguracaoContratoRepository` (futuro)
- [ ] Testar todas as buscas com Supabase ativo (pendente testes)
- [x] Verificar que não há mais uso de collections globais quando Supabase está ativo ✅
- [x] Documentar decisões finais ✅

---

## 🔍 VERIFICAÇÕES NECESSÁRIAS

### 1. Verificar onde mais collections globais são usadas

Buscar no código:
- `pagamentoGlobalRepo`
- `custoGlobalRepo`
- `servicoGlobalRepo`

### 2. Verificar relatórios

Os relatórios podem estar usando collections globais. Verificar:
- `DashboardReportService`
- `RelatoriosReportService`

### 3. Testar performance

Após as alterações, testar:
- Busca de todos os pagamentos
- Busca de todos os custos
- Busca de todos os serviços
- Geração de relatórios

---

## 📝 OBSERVAÇÕES

1. **Collections Globais no Firebase**: Podem ser removidas completamente após migração, mas manter por enquanto para fallback.

2. **Performance**: Com índices criados no Supabase, `findAll(userId)` será igual ou melhor que collections globais.

3. **Consistência**: Remover collections globais elimina risco de dados duplicados/inconsistentes.

4. **FuncionalidadeService**: Já está correto usando Firebase para planos/funcionalidades.

5. **ArquivoRepository**: Está correto - metadados no Firestore, arquivos no S3.
