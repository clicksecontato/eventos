# Mapeamento Completo: Supabase vs Firebase/Firestore

**Data**: 2025-01-XX  
**Modo**: Planejador (apenas análise, sem modificações)

---

## 📊 RESUMO EXECUTIVO

### ✅ **No Supabase** (18 tabelas + repositórios implementados)
- 11 tabelas com repositórios Supabase funcionais
- 7 tabelas criadas no schema mas **sem repositórios Supabase ainda**
- Sistema híbrido funcionando via `RepositoryFactory`

### 🔥 **Ainda no Firebase/Firestore** (collections globais e específicas)
- 7 repositórios que ainda não têm versão Supabase
- Collections globais para otimização (mantidas mesmo no Firebase)
- Algumas estruturas antigas que podem não estar mais em uso

---

## ✅ O QUE ESTÁ NO SUPABASE

### 📋 **Tabelas Criadas no Schema SQL** (`supabase/schema.sql`)

O schema define **18 tabelas** no Supabase:

#### **1. Tabelas Principais**
1. ✅ **`users`** - Usuários do sistema
   - **Status**: Tabela criada, mas **repositório ainda usa Firebase**
   - **Repositório**: `UserRepository` (Firebase)

#### **2. Tabelas de Configuração (por usuário)**
2. ✅ **`canais_entrada`** - Canais de entrada dos clientes
   - **Status**: ✅ **COMPLETO** - Repositório Supabase implementado
   - **Repositório**: `CanalEntradaSupabaseRepository`

3. ✅ **`tipo_eventos`** - Tipos de eventos
   - **Status**: ✅ **COMPLETO** - Repositório Supabase implementado
   - **Repositório**: `TipoEventoSupabaseRepository`

4. ✅ **`tipo_custos`** - Tipos de custos
   - **Status**: ✅ **COMPLETO** - Repositório Supabase implementado
   - **Repositório**: `TipoCustoSupabaseRepository`

5. ✅ **`tipo_servicos`** - Tipos de serviços
   - **Status**: ✅ **COMPLETO** - Repositório Supabase implementado
   - **Repositório**: `TipoServicoSupabaseRepository`

#### **3. Tabelas de Dados Principais**
6. ✅ **`clientes`** - Clientes dos usuários
   - **Status**: ✅ **COMPLETO** - Repositório Supabase implementado
   - **Repositório**: `ClienteSupabaseRepository`

7. ✅ **`eventos`** - Eventos agendados
   - **Status**: ✅ **COMPLETO** - Repositório Supabase implementado
   - **Repositório**: `EventoSupabaseRepository`

8. ✅ **`pagamentos`** - Pagamentos dos eventos
   - **Status**: ✅ **COMPLETO** - Repositório Supabase implementado
   - **Repositório**: `PagamentoSupabaseRepository`
   - **Nota**: No Firebase havia subcollection, no Supabase é tabela com `user_id` + `evento_id`

9. ✅ **`custos`** - Custos dos eventos
   - **Status**: ✅ **COMPLETO** - Repositório Supabase implementado
   - **Repositório**: `CustoSupabaseRepository`
   - **Nota**: No Firebase havia subcollection, no Supabase é tabela com `user_id` + `evento_id`

10. ✅ **`servicos_evento`** - Serviços vinculados aos eventos
    - **Status**: ✅ **COMPLETO** - Repositório Supabase implementado
    - **Repositório**: `ServicoEventoSupabaseRepository`
    - **Nota**: No Firebase havia subcollection, no Supabase é tabela com `user_id` + `evento_id`

11. ✅ **`anexos_pagamento`** - Anexos de pagamento
    - **Status**: ⚠️ **Tabela criada, mas SEM repositório Supabase**
    - **Repositório Firebase**: `AnexoPagamentoRepository`

12. ✅ **`anexos_eventos`** - Anexos de eventos
    - **Status**: ⚠️ **Tabela criada, mas SEM repositório Supabase**
    - **Repositório Firebase**: Não encontrado repositório específico

#### **4. Tabelas de Contratos**
13. ✅ **`modelos_contrato`** - Modelos de contrato
    - **Status**: ⚠️ **Tabela criada, mas SEM repositório Supabase**
    - **Repositório Firebase**: `ModeloContratoRepository`

14. ✅ **`configuracao_contrato`** - Configuração de contrato por usuário
    - **Status**: ⚠️ **Tabela criada, mas SEM repositório Supabase**
    - **Repositório Firebase**: `ConfiguracaoContratoRepository`

15. ✅ **`contratos`** - Contratos gerados
    - **Status**: ✅ **COMPLETO** - Repositório Supabase implementado
    - **Repositório**: `ContratoSupabaseRepository`

#### **5. Tabelas de Relatórios e Cache**
16. ✅ **`relatorios_diarios`** - Cache de relatórios diários
    - **Status**: ⚠️ **Tabela criada, mas SEM repositório Supabase**
    - **Repositório Firebase**: `RelatoriosDiariosRepository`

17. ✅ **`relatorios_cache`** - Snapshots de relatórios
    - **Status**: ⚠️ **Tabela criada, mas SEM repositório Supabase**
    - **Repositório Firebase**: `RelatorioCacheRepository`

#### **6. Tabelas de Integração**
18. ✅ **`google_calendar_tokens`** - Tokens do Google Calendar
    - **Status**: ⚠️ **Tabela criada, mas SEM repositório Supabase**
    - **Repositório Firebase**: `GoogleCalendarTokenRepository`

---

### 🔧 **Repositórios Supabase Implementados** (11 repositórios)

1. ✅ **ClienteSupabaseRepository** (`cliente-supabase-repository.ts`)
2. ✅ **EventoSupabaseRepository** (`evento-supabase-repository.ts`)
3. ✅ **PagamentoSupabaseRepository** (`pagamento-supabase-repository.ts`)
4. ✅ **CustoSupabaseRepository** (`custo-supabase-repository.ts`)
5. ✅ **ServicoEventoSupabaseRepository** (`servico-evento-supabase-repository.ts`)
6. ✅ **CanalEntradaSupabaseRepository** (`canal-entrada-supabase-repository.ts`)
7. ✅ **TipoEventoSupabaseRepository** (`tipo-evento-supabase-repository.ts`)
8. ✅ **TipoCustoSupabaseRepository** (`tipo-custo-supabase-repository.ts`)
9. ✅ **TipoServicoSupabaseRepository** (`tipo-servico-supabase-repository.ts`)
10. ✅ **ContratoSupabaseRepository** (`contrato-supabase-repository.ts`) - **RECÉM CRIADO**

**Total**: 10 repositórios principais funcionais no Supabase

---

## 🔥 O QUE AINDA ESTÁ NO FIREBASE/FIRESTORE

### 📦 **Repositórios que NÃO têm versão Supabase**

Segundo o `RepositoryFactory`, estes repositórios **sempre usam Firebase**, mesmo quando `NEXT_PUBLIC_USE_SUPABASE=true`:

1. 🔥 **`PagamentoGlobalRepository`**
   - **Collection**: `controle_users/{userId}/pagamentos`
   - **Função**: Collection global para consultas rápidas de todos os pagamentos
   - **Status**: ⚠️ Ainda não migrado para Supabase
   - **Observação**: No Supabase, podemos usar `PagamentoSupabaseRepository.findAll(userId)` diretamente

2. 🔥 **`CustoGlobalRepository`**
   - **Collection**: `controle_users/{userId}/custos`
   - **Função**: Collection global para consultas rápidas de todos os custos
   - **Status**: ⚠️ Ainda não migrado para Supabase
   - **Observação**: No Supabase, podemos usar `CustoSupabaseRepository.findAll(userId)` diretamente

3. 🔥 **`ServicoGlobalRepository`**
   - **Collection**: `controle_users/{userId}/servicos`
   - **Função**: Collection global para consultas rápidas de todos os serviços
   - **Status**: ⚠️ Ainda não migrado para Supabase
   - **Observação**: No Supabase, podemos usar `ServicoEventoSupabaseRepository.findAll(userId)` diretamente

4. 🔥 **`UserRepository`**
   - **Collection**: `controle_users`
   - **Função**: Gerenciamento de usuários
   - **Status**: ⚠️ Ainda não migrado para Supabase
   - **Observação**: Tabela `users` existe no Supabase, mas repositório não foi criado

5. 🔥 **`ArquivoRepository`**
   - **Collection**: Não especificada claramente
   - **Função**: Gerenciamento de arquivos
   - **Status**: ⚠️ Ainda não migrado para Supabase
   - **Observação**: Arquivos podem estar no S3, repositório gerencia metadados

6. 🔥 **`GoogleCalendarTokenRepository`**
   - **Collection**: `google_calendar_tokens`
   - **Função**: Armazenar tokens OAuth do Google Calendar
   - **Status**: ⚠️ Tabela existe no Supabase, mas repositório não foi criado

7. 🔥 **`ModeloContratoRepository`**
   - **Collection**: `modelos_contrato`
   - **Função**: Gerenciar modelos de contrato
   - **Status**: ⚠️ Tabela existe no Supabase, mas repositório não foi criado

8. 🔥 **`ConfiguracaoContratoRepository`**
   - **Collection**: `configuracao_contrato` (subcollection)
   - **Função**: Configurações de contrato por usuário
   - **Status**: ⚠️ Tabela existe no Supabase, mas repositório não foi criado

### 📦 **Outros Repositórios/Collections que podem existir**

Baseado no arquivo `collections.ts`, existem estas collections no Firebase que podem não ter repositório Supabase:

9. 🔥 **`AnexoPagamentoRepository`**
   - **Collection**: Provavelmente subcollection de pagamentos
   - **Status**: ⚠️ Tabela `anexos_pagamento` existe no Supabase, mas repositório não foi criado

10. 🔥 **Anexos de Eventos**
    - **Collection**: `controle_anexos_eventos`
    - **Status**: ⚠️ Tabela `anexos_eventos` existe no Supabase, mas repositório não foi criado

11. 🔥 **Collections Globais Antigas** (pode não estar em uso ativo):
    - `controle_historico_pagamentos`
    - `controle_servicos`
    - `controle_pacotes_servicos`
    - `controle_contratos_servicos`
    - `controle_promoters`
    - `controle_insumos`
    - **Status**: Não migrados e podem não estar mais em uso

12. 🔥 **Relatórios**
    - `RelatoriosDiariosRepository`
    - `RelatorioCacheRepository`
    - **Status**: ⚠️ Tabelas existem no Supabase, mas repositórios não foram criados

13. 🔥 **Outros repositórios específicos**:
    - `AssinaturaRepository`
    - `PlanoRepository`
    - `FuncionalidadeRepository`
    - `PasswordResetTokenRepository`
    - **Status**: Não têm tabelas correspondentes no schema Supabase ainda

---

## 📊 COMPARAÇÃO DETALHADA

### ✅ **Migrado Completamente** (tabela + repositório + funcionando)

| Tabela Supabase | Collection Firebase | Repositório Supabase | Status |
|-----------------|---------------------|----------------------|--------|
| `clientes` | `controle_users/{userId}/clientes` | ✅ `ClienteSupabaseRepository` | ✅ COMPLETO |
| `eventos` | `controle_users/{userId}/eventos` | ✅ `EventoSupabaseRepository` | ✅ COMPLETO |
| `pagamentos` | `controle_users/{userId}/eventos/{eventoId}/pagamentos` | ✅ `PagamentoSupabaseRepository` | ✅ COMPLETO |
| `custos` | `controle_users/{userId}/eventos/{eventoId}/custos` | ✅ `CustoSupabaseRepository` | ✅ COMPLETO |
| `servicos_evento` | `controle_users/{userId}/eventos/{eventoId}/servicos` | ✅ `ServicoEventoSupabaseRepository` | ✅ COMPLETO |
| `canais_entrada` | `controle_users/{userId}/canais_entrada` | ✅ `CanalEntradaSupabaseRepository` | ✅ COMPLETO |
| `tipo_eventos` | `controle_users/{userId}/tipo_eventos` | ✅ `TipoEventoSupabaseRepository` | ✅ COMPLETO |
| `tipo_custos` | `controle_users/{userId}/tipo_custos` | ✅ `TipoCustoSupabaseRepository` | ✅ COMPLETO |
| `tipo_servicos` | `controle_users/{userId}/tipo_servicos` | ✅ `TipoServicoSupabaseRepository` | ✅ COMPLETO |
| `contratos` | `controle_users/{userId}/contratos` | ✅ `ContratoSupabaseRepository` | ✅ COMPLETO |

**Total**: 10 tabelas completamente migradas

---

### ⚠️ **Tabela Criada, MAS Sem Repositório Supabase** (7 tabelas)

| Tabela Supabase | Collection Firebase | Repositório Firebase | Status |
|-----------------|---------------------|----------------------|--------|
| `users` | `controle_users` | 🔥 `UserRepository` | ⚠️ Tabela existe, repositório não |
| `anexos_pagamento` | Subcollection | 🔥 `AnexoPagamentoRepository` | ⚠️ Tabela existe, repositório não |
| `anexos_eventos` | `controle_anexos_eventos` | - | ⚠️ Tabela existe, repositório não |
| `modelos_contrato` | `modelos_contrato` | 🔥 `ModeloContratoRepository` | ⚠️ Tabela existe, repositório não |
| `configuracao_contrato` | Subcollection | 🔥 `ConfiguracaoContratoRepository` | ⚠️ Tabela existe, repositório não |
| `relatorios_diarios` | `controle_users/{userId}/relatorios` | 🔥 `RelatoriosDiariosRepository` | ⚠️ Tabela existe, repositório não |
| `relatorios_cache` | `controle_users/{userId}/relatorios_cache` | 🔥 `RelatorioCacheRepository` | ⚠️ Tabela existe, repositório não |
| `google_calendar_tokens` | `google_calendar_tokens` | 🔥 `GoogleCalendarTokenRepository` | ⚠️ Tabela existe, repositório não |

**Total**: 8 tabelas criadas mas sem repositórios Supabase

---

### 🔥 **Apenas no Firebase** (sem tabela no Supabase)

| Collection Firebase | Repositório | Status | Observação |
|---------------------|-------------|--------|------------|
| `controle_users/{userId}/pagamentos` (global) | 🔥 `PagamentoGlobalRepository` | 🔥 Firebase | Collection global - pode ser substituída por `PagamentoSupabaseRepository.findAll()` |
| `controle_users/{userId}/custos` (global) | 🔥 `CustoGlobalRepository` | 🔥 Firebase | Collection global - pode ser substituída por `CustoSupabaseRepository.findAll()` |
| `controle_users/{userId}/servicos` (global) | 🔥 `ServicoGlobalRepository` | 🔥 Firebase | Collection global - pode ser substituída por `ServicoEventoSupabaseRepository.findAll()` |
| `controle_historico_pagamentos` | - | 🔥 Firebase | Collection global antiga - pode não estar em uso |
| `controle_servicos` | - | 🔥 Firebase | Collection global antiga - pode não estar em uso |
| `controle_pacotes_servicos` | - | 🔥 Firebase | Collection global antiga - pode não estar em uso |
| `controle_contratos_servicos` | - | 🔥 Firebase | Collection global antiga - pode não estar em uso |
| `controle_promoters` | - | 🔥 Firebase | Collection global antiga - pode não estar em uso |
| `controle_insumos` | - | 🔥 Firebase | Collection global antiga - pode não estar em uso |
| Collections de `Assinatura`, `Plano`, `Funcionalidade` | 🔥 Vários | 🔥 Firebase | Não têm tabelas correspondentes no schema |

---

## 🔄 ESTRUTURA HÍBRIDA ATUAL

### **Como Funciona**

O sistema usa um `RepositoryFactory` que decide qual repositório usar baseado na variável `NEXT_PUBLIC_USE_SUPABASE`:

```typescript
// Se NEXT_PUBLIC_USE_SUPABASE=true
✅ ClienteSupabaseRepository
✅ EventoSupabaseRepository
✅ PagamentoSupabaseRepository
✅ CustoSupabaseRepository
✅ ServicoEventoSupabaseRepository
✅ CanalEntradaSupabaseRepository
✅ TipoEventoSupabaseRepository
✅ TipoCustoSupabaseRepository
✅ TipoServicoSupabaseRepository
✅ ContratoSupabaseRepository

// Sempre Firebase (mesmo com USE_SUPABASE=true)
🔥 PagamentoGlobalRepository
🔥 CustoGlobalRepository
🔥 ServicoGlobalRepository
🔥 UserRepository
🔥 ArquivoRepository
🔥 GoogleCalendarTokenRepository
🔥 ModeloContratoRepository
🔥 ConfiguracaoContratoRepository
```

---

## 📝 OBSERVAÇÕES IMPORTANTES

### ✅ **O Que Está Funcionando Bem**

1. **10 repositórios principais** estão completamente migrados e funcionais
2. **Estrutura híbrida** permite migração gradual
3. **API Routes** criadas para contornar RLS quando necessário
4. **Geração de UUID** implementada para criação de registros
5. **Conversão automática** entre camelCase (app) e snake_case (DB)

### ⚠️ **Pontos de Atenção**

1. **Collections Globais** (`PagamentoGlobalRepository`, etc.) ainda usam Firebase mesmo quando Supabase está ativo
   - **Impacto**: Pode causar dados inconsistentes ou duplicados
   - **Solução**: Usar `findAll(userId)` dos repositórios Supabase diretamente

2. **Tabelas sem repositórios** no Supabase precisam ser implementadas:
   - `users` - repositório crítico
   - `anexos_pagamento` e `anexos_eventos` - importantes para funcionalidade
   - `modelos_contrato` e `configuracao_contrato` - necessários para contratos
   - `relatorios_*` - para cache de relatórios
   - `google_calendar_tokens` - para integração

3. **Estrutura de dados diferente**:
   - **Firebase**: Subcollections aninhadas (path-based)
   - **Supabase**: Tabelas relacionais com `user_id` (column-based)

4. **Collections antigas** no Firebase que podem não estar mais em uso:
   - `controle_historico_pagamentos`
   - `controle_servicos`
   - `controle_pacotes_servicos`
   - etc.

---

## 🎯 CONCLUSÃO

### **Status Geral da Migração**

- ✅ **10 tabelas/repositórios** completamente migrados e funcionais
- ⚠️ **8 tabelas** criadas no schema mas sem repositórios Supabase
- 🔥 **7+ repositórios** ainda dependentes apenas do Firebase
- ⚠️ **Collections globais** ainda no Firebase mesmo quando Supabase está ativo

### **Percentual de Migração**

- **Tabelas criadas no Supabase**: 18/18 (100%)
- **Repositórios Supabase implementados**: 10/18 (56%)
- **Funcionalidades completamente migradas**: 10/18 (56%)

---

## 📌 PRÓXIMOS PASSOS RECOMENDADOS

1. Criar repositórios Supabase para as 8 tabelas que já existem no schema
2. Migrar ou remover collections globais do Firebase
3. Criar repositório Supabase para `users`
4. Implementar repositórios para anexos (pagamento e eventos)
5. Implementar repositórios para modelos e Dados da Empresa para gerar Contratos
6. Avaliar necessidade de migrar collections antigas do Firebase


