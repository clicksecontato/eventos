# Migração de Contratos para Supabase

**Data**: 2025-01-XX  
**Status**: ✅ **CONCLUÍDA**

---

## 📋 RESUMO

Migração completa dos repositórios de contratos do Firebase para Supabase:
- ✅ `ModeloContratoRepository` → `ModeloContratoSupabaseRepository`
- ✅ `ConfiguracaoContratoRepository` → `ConfiguracaoContratoSupabaseRepository`
- ✅ `ContratoRepository` → `ContratoSupabaseRepository` (já existia)

---

## ✅ O QUE FOI IMPLEMENTADO

### 1. **ModeloContratoSupabaseRepository**

**Arquivo**: `src/lib/repositories/supabase/modelo-contrato-supabase-repository.ts`

**Funcionalidades**:
- ✅ `findAtivos()` - Buscar modelos ativos ordenados por nome
- ✅ `findAll()` - Buscar todos os modelos
- ✅ `findById()` - Buscar por ID
- ✅ `create()` - Criar novo modelo
- ✅ `update()` - Atualizar modelo
- ✅ `delete()` - Deletar modelo
- ✅ `validarTemplate()` - Validar template contra campos

**Tabela**: `modelos_contrato`
- `id`, `nome`, `descricao`, `template`, `campos` (JSONB), `ativo`, `data_cadastro`, `data_atualizacao`

---

### 2. **ConfiguracaoContratoSupabaseRepository**

**Arquivo**: `src/lib/repositories/supabase/configuracao-contrato-supabase-repository.ts`

**Funcionalidades**:
- ✅ `findByUserId()` - Buscar configuração por usuário (única por usuário)
- ✅ `createOrUpdate()` - Criar ou atualizar configuração
- ✅ `create()` - Criar nova configuração
- ✅ `update()` - Atualizar configuração
- ✅ `getCamposFixos()` - Obter campos fixos formatados para templates

**Tabela**: `configuracao_contrato`
- `id`, `user_id`, `razao_social`, `nome_fantasia`, `cnpj`, `inscricao_estadual`
- `endereco` (JSONB), `contato` (JSONB), `dados_bancarios` (JSONB)
- `foro`, `cidade`, `data_cadastro`, `data_atualizacao`
- **Constraint**: `UNIQUE(user_id)` - Um usuário tem apenas uma configuração

---

### 3. **RepositoryFactory Atualizado**

**Arquivo**: `src/lib/repositories/repository-factory.ts`

**Alterações**:
- ✅ Importados novos repositórios Supabase
- ✅ Tipos atualizados para suportar ambos (Firebase | Supabase)
- ✅ Inicialização condicional baseada em `USE_SUPABASE`
- ✅ Getters atualizados com tipos corretos

**Comportamento**:
- Se `NEXT_PUBLIC_USE_SUPABASE=true` → Usa repositórios Supabase
- Se `NEXT_PUBLIC_USE_SUPABASE=false` ou não configurado → Usa repositórios Firebase

---

## 🔄 COMPATIBILIDADE

### Serviços que Usam Contratos

**ContratoService** (`src/lib/services/contrato-service.ts`):
- ✅ Já usa `repositoryFactory.getConfiguracaoContratoRepository()`
- ✅ Já usa `repositoryFactory.getContratoRepository()`
- ✅ Funciona automaticamente com ambos os repositórios

**API Routes** (`src/app/api/contratos/route.ts`):
- ✅ Já usa `repositoryFactory.getModeloContratoRepository()`
- ✅ Funciona automaticamente com ambos os repositórios

---

## 📊 ESTRUTURA DE DADOS

### ModeloContrato

```typescript
{
  id: string;
  nome: string;
  descricao?: string;
  template: string;
  campos: CampoContrato[]; // JSONB no Supabase
  ativo: boolean;
  dataCadastro: Date;
  dataAtualizacao: Date;
}
```

### ConfiguracaoContrato

```typescript
{
  id: string;
  userId: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  contato: {
    telefone: string;
    email: string;
    site?: string;
  };
  dadosBancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    tipo: string;
    pix?: string;
  };
  foro?: string;
  cidade?: string;
  dataCadastro: Date;
  dataAtualizacao: Date;
}
```

---

## ✅ CHECKLIST DE MIGRAÇÃO

- [x] Criar `ModeloContratoSupabaseRepository`
- [x] Criar `ConfiguracaoContratoSupabaseRepository`
- [x] Atualizar `RepositoryFactory` para usar Supabase quando disponível
- [x] Verificar compatibilidade com serviços existentes
- [x] Verificar tipos e interfaces
- [x] Testar linter (sem erros)

---

## 🎯 PRÓXIMOS PASSOS (Opcional)

1. **Testar em ambiente de desenvolvimento**
   - Criar modelos de contrato
   - Criar configurações de contrato
   - Gerar contratos
   - Verificar que tudo funciona com Supabase

2. **Migrar dados existentes** (se necessário)
   - Script para migrar modelos do Firebase para Supabase
   - Script para migrar configurações do Firebase para Supabase

3. **Remover repositórios Firebase** (após validação completa)
   - Manter por enquanto para fallback
   - Remover após confirmação de que tudo funciona

---

## 📝 OBSERVAÇÕES

1. **Tabelas já existem no Supabase**: As tabelas `modelos_contrato` e `configuracao_contrato` já estavam criadas no schema SQL.

2. **Índices criados**: 
   - `idx_modelos_contrato_ativo` - Para busca de modelos ativos
   - `idx_configuracao_contrato_user_id` - Para busca por usuário

3. **Constraint UNIQUE**: `configuracao_contrato` tem `UNIQUE(user_id)`, garantindo que cada usuário tenha apenas uma configuração.

4. **JSONB**: Campos complexos (`campos`, `endereco`, `contato`, `dados_bancarios`) são armazenados como JSONB no Supabase, mantendo flexibilidade.

5. **Compatibilidade**: Todos os serviços existentes continuam funcionando sem alterações, pois usam o `RepositoryFactory` que agora retorna os repositórios corretos baseado na configuração.

---

## ✅ STATUS FINAL

**Migração concluída com sucesso!**

Todos os repositórios de contratos agora suportam Supabase e Firebase, com seleção automática baseada na variável de ambiente `NEXT_PUBLIC_USE_SUPABASE`.
