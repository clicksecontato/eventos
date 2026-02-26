# Plano: Remoção da Flag USE_SUPABASE e Uso Automático de Cada Banco

## Data: 2025-01-XX
## Modo: Planejador

---

## 🎯 OBJETIVO

Remover a necessidade da flag `USE_SUPABASE=true` e fazer com que cada repositório use automaticamente seu banco de dados específico conforme a regra de negócio definida.

---

## 📋 REGRAS DE NEGÓCIO DEFINIDAS

### ✅ **Repositórios que DEVEM usar Supabase** (sempre)

1. **ClienteRepository** → `ClienteSupabaseRepository`
2. **EventoRepository** → `EventoSupabaseRepository`
3. **PagamentoRepository** → `PagamentoSupabaseRepository`
4. **CustoEventoRepository** → `CustoSupabaseRepository`
5. **ServicoEventoRepository** → `ServicoEventoSupabaseRepository`
6. **CanalEntradaRepository** → `CanalEntradaSupabaseRepository`
7. **TipoEventoRepository** → `TipoEventoSupabaseRepository`
8. **TipoCustoRepository** → `TipoCustoSupabaseRepository`
9. **TipoServicoRepository** → `TipoServicoSupabaseRepository`
10. **ContratoRepository** → `ContratoSupabaseRepository`
11. **ModeloContratoRepository** → `ModeloContratoSupabaseRepository` (criar)
12. **ConfiguracaoContratoRepository** → `ConfiguracaoContratoSupabaseRepository` (criar)
13. **RelatoriosDiariosRepository** → `RelatoriosDiariosSupabaseRepository`
14. **RelatorioCacheRepository** → `RelatorioCacheSupabaseRepository`

### 🔥 **Repositórios que DEVEM usar Firestore** (sempre)

1. **UserRepository** → `UserRepository` (Firestore)
2. **ArquivoRepository** → `ArquivoRepository` (Firestore)
3. **GoogleCalendarTokenRepository** → `GoogleCalendarTokenRepository` (Firestore)
4. **PlanoRepository** → `PlanoRepository` (Firestore)
5. **AssinaturaRepository** → `AssinaturaRepository` (Firestore)
6. **FuncionalidadeRepository** → `FuncionalidadeRepository` (Firestore)

### ❌ **Collections Globais a REMOVER**

1. **PagamentoGlobalRepository** → Substituir por `PagamentoSupabaseRepository.findAll(userId)`
2. **CustoGlobalRepository** → Substituir por `CustoSupabaseRepository.findAll(userId)`
3. **ServicoGlobalRepository** → Substituir por `ServicoEventoSupabaseRepository.findAll(userId)`

---

## 📝 PLANO DE IMPLEMENTAÇÃO

### **FASE 1: Verificar Repositórios Supabase**

#### 1.1 Verificar `ModeloContratoSupabaseRepository`
- ✅ **Status**: Já existe em `src/lib/repositories/supabase/modelo-contrato-supabase-repository.ts`
- **Ação**: Apenas garantir que está sendo usado corretamente

#### 1.2 Verificar `ConfiguracaoContratoSupabaseRepository`
- ✅ **Status**: Já existe em `src/lib/repositories/supabase/configuracao-contrato-supabase-repository.ts`
- **Ação**: Apenas garantir que está sendo usado corretamente

---

### **FASE 2: Atualizar RepositoryFactory**

#### 2.1 Remover lógica condicional baseada em flag
- Remover variável `useSupabase`
- Remover verificação de `NEXT_PUBLIC_USE_SUPABASE`
- Remover logs de depuração
- Remover método `isUsingSupabase()`

#### 2.2 Inicializar repositórios com regras fixas
- **Supabase**: Sempre inicializar repositórios Supabase para entidades definidas
- **Firestore**: Sempre inicializar repositórios Firestore para entidades definidas
- **Validação**: Se Supabase não estiver configurado, lançar erro claro ao inicializar repositórios Supabase

#### 2.3 Remover collections globais
- Remover `PagamentoGlobalRepository` do factory
- Remover `CustoGlobalRepository` do factory
- Remover `ServicoGlobalRepository` do factory
- Remover métodos getter correspondentes

---

### **FASE 3: Substituir Uso de Collections Globais**

#### 3.1 Atualizar `DataService`
- Substituir `pagamentoGlobalRepo.findAll()` por `pagamentoRepo.findAll()`
- Substituir `custoGlobalRepo.findAll()` por `custoEventoRepo.findAll()`
- Substituir `servicoGlobalRepo.findAll()` por `servicoEventoRepo.findAll()`
- Remover referências a repositórios globais
- Remover logs de depuração relacionados a `isUsingSupabase()`

#### 3.2 Atualizar `RelatoriosReportService`
- Substituir `pagamentoGlobalRepo.findAll()` por `pagamentoRepo.findAll()`
- Substituir `custoGlobalRepo.findAll()` por `custoEventoRepo.findAll()`
- Substituir `servicoGlobalRepo.findAll()` por `servicoEventoRepo.findAll()`
- Remover referências a repositórios globais

#### 3.3 Atualizar `DashboardReportService`
- Substituir `pagamentoGlobalRepo.findAll()` por `pagamentoRepo.findAll()`
- Remover referências a repositórios globais

#### 3.4 Atualizar API Routes
- **`src/app/api/pagamentos/atualiza-pagamento/route.ts`**: Remover uso direto de `PagamentoGlobalRepository`
- **`src/app/api/custos/atualiza-custo/route.ts`**: Remover uso direto de `CustoGlobalRepository`
- **`src/app/api/servicos/atualiza-servico/route.ts`**: Remover uso direto de `ServicoGlobalRepository`

#### 3.5 Atualizar Repositórios que usam Collections Globais
- **`src/lib/repositories/pagamento-repository.ts`**: Remover uso de `PagamentoGlobalRepository`
- **`src/lib/repositories/custo-repository.ts`**: Remover uso de `CustoGlobalRepository`
- **`src/lib/repositories/servico-repository.ts`**: Remover uso de `ServicoGlobalRepository`

---

### **FASE 4: Remover Referências a `isUsingSupabase()`**

#### 4.1 Atualizar API Routes
- **`src/app/api/pagamentos/verify/route.ts`**: Remover verificação `isUsingSupabase()`
- **`src/app/api/init/canais-entrada/route.ts`**: Remover verificação `isUsingSupabase()`
- **`src/app/api/init/tipos-servico/route.ts`**: Remover verificação `isUsingSupabase()`
- **`src/app/api/init/tipos-evento/route.ts`**: Remover verificação `isUsingSupabase()`

#### 4.2 Atualizar `DataService`
- Remover todas as verificações `isUsingSupabase()`
- Remover logs condicionais baseados em `isUsingSupabase()`
- Simplificar lógica que dependia da flag

---

### **FASE 5: Validação e Tratamento de Erros**

#### 5.1 Validação de Configuração Supabase
- No `BaseSupabaseRepository`, já existe validação que lança erro se Supabase não estiver configurado
- Garantir que todos os repositórios Supabase herdam de `BaseSupabaseRepository`
- Mensagem de erro clara: "Supabase não está configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY"

#### 5.2 Tratamento de Erros
- Erros devem ser claros e informativos
- Não fazer fallback silencioso para Firestore
- Falhar explicitamente se Supabase não estiver configurado

---

### **FASE 6: Limpeza e Documentação**

#### 6.1 Remover Arquivos/Referências Não Utilizadas
- Manter implementações do Firestore (não remover)
- Remover apenas referências não utilizadas
- Remover logs de depuração

#### 6.2 Atualizar Documentação
- Atualizar `step-by-step/mapeamento-supabase-vs-firebase.md`
- Criar documentação sobre as regras fixas
- Atualizar `DEBUG_MIGRACAO.md` se necessário

#### 6.3 Remover Utilitários Não Utilizados
- **`src/lib/utils/check-database.ts`**: Avaliar se ainda é necessário ou remover

---

## 📊 RESUMO DAS ALTERAÇÕES

### Arquivos a Modificar
1. `src/lib/repositories/repository-factory.ts` - **PRINCIPAL**
2. `src/lib/data-service.ts`
3. `src/lib/services/relatorios-report-service.ts`
4. `src/lib/services/dashboard-report-service.ts`
5. `src/app/api/pagamentos/atualiza-pagamento/route.ts`
6. `src/app/api/custos/atualiza-custo/route.ts`
7. `src/app/api/servicos/atualiza-servico/route.ts`
8. `src/app/api/pagamentos/verify/route.ts`
9. `src/app/api/init/canais-entrada/route.ts`
10. `src/app/api/init/tipos-servico/route.ts`
11. `src/app/api/init/tipos-evento/route.ts`
12. `src/lib/repositories/pagamento-repository.ts`
13. `src/lib/repositories/custo-repository.ts`
14. `src/lib/repositories/servico-repository.ts`

### Arquivos a Remover (opcional)
- `src/lib/utils/check-database.ts` (se não for mais necessário)

### Arquivos a Manter (não remover implementações)
- Todos os repositórios Firestore devem ser mantidos
- Collections globais podem ser mantidas (mas não usadas)

---

## ⚠️ PONTOS DE ATENÇÃO

1. **Validação de Supabase**: O sistema deve falhar claramente se Supabase não estiver configurado para repositórios que precisam dele
2. **Compatibilidade**: Garantir que todas as interfaces sejam mantidas
3. **Testes**: Testar cada repositório após as mudanças
4. **Rollback**: Manter implementações Firestore para possível rollback

---

## ✅ CRITÉRIOS DE SUCESSO

1. ✅ Sistema não depende mais da flag `USE_SUPABASE`
2. ✅ Cada repositório usa automaticamente seu banco correto
3. ✅ Collections globais foram substituídas por `findAll()` dos repositórios Supabase
4. ✅ Método `isUsingSupabase()` foi removido
5. ✅ Logs de depuração foram removidos
6. ✅ Sistema falha claramente se Supabase não estiver configurado
7. ✅ Implementações Firestore foram mantidas (não removidas)

---

## 🚀 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Fase 1**: Criar repositórios Supabase faltantes
2. **Fase 2**: Atualizar RepositoryFactory (mudança principal)
3. **Fase 3**: Substituir uso de collections globais
4. **Fase 4**: Remover referências a `isUsingSupabase()`
5. **Fase 5**: Validação e tratamento de erros
6. **Fase 6**: Limpeza e documentação

---

## 📝 NOTAS TÉCNICAS

- **Validação Supabase**: Já existe em `BaseSupabaseRepository`, apenas garantir que todos herdem dele
- **Collections Globais**: Podem ser mantidas no código, mas não serão mais usadas
- **Interface**: Todos os repositórios mantêm a mesma interface, garantindo compatibilidade

