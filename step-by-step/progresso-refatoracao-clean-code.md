# Progresso da Refatoração: Clean Code e SOLID

## Data: 2025-01-XX

---

## ✅ FASE 1: COMPLETA

### 1.1 ServiceFactory Criado
- ✅ Arquivo `src/lib/factories/service-factory.ts` criado
- ✅ Lazy initialization implementada para evitar dependências circulares
- ✅ Helper `getRepositoryFactoryLazy()` para importação segura
- ✅ Todos os serviços principais incluídos

### 1.2 Route Helpers Criados
- ✅ Arquivo `src/lib/api/types.ts` com tipos padronizados
- ✅ Arquivo `src/lib/api/route-helpers.ts` com funções:
  - `getAuthenticatedUser()` - validação de sessão
  - `getAuthenticatedUserOptional()` - validação opcional
  - `requireAdmin()` - validação de admin
  - `handleApiError()` - tratamento de erros padronizado
  - `createApiResponse()` - resposta padronizada
  - `createErrorResponse()` - resposta de erro padronizada
  - `getRequestBody()` - validação de body
  - `getRouteParams()` - obtenção de parâmetros
  - `getQueryParams()` - obtenção de query params

### 1.3 Serviços Atualizados
- ✅ `PlanoService` - aceita dependências via construtor (compatibilidade mantida)
- ✅ `AssinaturaService` - aceita dependências via construtor (compatibilidade mantida)
- ✅ `FuncionalidadeService` - aceita dependências via construtor (compatibilidade mantida)
- ✅ `HotmartWebhookService` - aceita dependências via construtor (compatibilidade mantida)

### 1.4 RepositoryFactory Expandido
- ✅ Adicionados repositórios Firestore faltantes:
  - `getPlanoRepository()`
  - `getFuncionalidadeRepository()`
  - `getAssinaturaRepository()`
  - `getPasswordResetTokenRepository()`
- ✅ Adicionados repositórios globais Firestore:
  - `getPagamentoGlobalRepository()`
  - `getCustoGlobalRepository()`
  - `getServicoGlobalRepository()`

### 1.5 Route Helpers Expandidos
- ✅ Adicionada função `getUserIdWithApiKeyOrDev()` para autenticação flexível em rotas de migração/normalização

---

## ✅ FASE 2: COMPLETA

### 2.1 Rotas de Planos
- ✅ `src/app/api/planos/route.ts` - refatorada
- ✅ `src/app/api/planos/[id]/route.ts` - refatorada
- ✅ Usa `repositoryFactory` e `serviceFactory` (importação dinâmica)
- ✅ Usa `route-helpers` para padronização

### 2.2 Rotas de Assinaturas
- ✅ `src/app/api/assinaturas/route.ts` - já estava refatorada

### 2.3 Rotas de Funcionalidades
- ✅ `src/app/api/funcionalidades/route.ts` - já estava refatorada
- ✅ `src/app/api/funcionalidades/[id]/route.ts` - refatorada
- ✅ `src/app/api/funcionalidades/por-ids/route.ts` - refatorada

---

## ✅ FASE 3: COMPLETA

### Rotas de Contratos e Modelos
- ✅ `src/app/api/contratos/route.ts` - refatorada
- ✅ `src/app/api/contratos/[id]/route.ts` - refatorada
- ✅ `src/app/api/contratos/[id]/gerar-pdf/route.ts` - refatorada
- ✅ `src/app/api/contratos/preview/route.ts` - refatorada
- ✅ `src/app/api/modelos-contrato/route.ts` - refatorada
- ✅ `src/app/api/configuracao-contrato/route.ts` - refatorada
- ✅ `src/app/api/configuracao-contrato/campos-fixos/route.ts` - refatorada

---

## ✅ FASE 4: COMPLETA

### Rotas de Eventos, Clientes, Pagamentos, Custos, Serviços
- ✅ `src/app/api/eventos/[id]/route.ts` - refatorada
- ✅ `src/app/api/pagamentos/create/route.ts` - refatorada
- ✅ `src/app/api/custos/create/route.ts` - refatorada
- ✅ `src/app/api/tipos-custo/create/route.ts` - refatorada
- ✅ `src/app/api/alterar-plano/route.ts` - refatorada
- ✅ `src/app/api/users/[id]/assinatura/route.ts` - refatorada
- ✅ `src/app/api/arquivos/route.ts` - refatorada
- ✅ `src/app/api/comprovantes/route.ts` - refatorada
- ✅ `src/app/api/upload/route.ts` - refatorada
- ✅ `src/app/api/upload-comprovante/route.ts` - refatorada

---

## ✅ FASE 5: COMPLETA

### Rotas Especiais
- ✅ `src/app/api/webhooks/hotmart/route.ts` - refatorada (POST, GET)
- ✅ `src/app/api/google-calendar/auth/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/callback/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/status/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/disconnect/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/toggle-sync/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/refresh-token/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/events/route.ts` - refatorada
- ✅ `src/app/api/auth/reset-password/route.ts` - refatorada
- ✅ `src/app/api/auth/resolve-reset-token/route.ts` - refatorada

---

## 📝 NOTAS TÉCNICAS

### Solução para Dependências Circulares
- **Problema**: Importação estática de `getServiceFactory` causava dependência circular durante o build
- **Solução**: Usar importação dinâmica (`await import()`) dentro das funções das rotas
- **Implementação**: 
  ```typescript
  // ❌ Antes (causava erro)
  import { getServiceFactory } from '@/lib/factories/service-factory';
  
  // ✅ Depois (funciona)
  const { getServiceFactory } = await import('@/lib/factories/service-factory');
  ```

### Padrão de Refatoração
1. Substituir `getServerSession` por `getAuthenticatedUser()` ou `requireAdmin()`
2. Substituir `new Repository()` por `repositoryFactory.getRepository()`
3. Substituir `new Service()` por `serviceFactory.getService()` (com importação dinâmica)
4. Substituir tratamento de erro manual por `handleApiError()`
5. Substituir `NextResponse.json()` por `createApiResponse()` ou `createErrorResponse()`
6. Usar `getRequestBody()`, `getRouteParams()`, `getQueryParams()` para dados da requisição

---

## ✅ CRITÉRIOS DE SUCESSO ATINGIDOS

- ✅ Build passa sem erros
- ✅ ServiceFactory funcionando
- ✅ Route helpers funcionando
- ✅ Rotas refatoradas seguem padrão consistente
- ✅ Compatibilidade mantida (serviços ainda funcionam sem dependências injetadas)

---

---

## ✅ FASE 4: COMPLETA

### Rotas Refatoradas ✅
- ✅ `src/app/api/eventos/[id]/route.ts` - refatorada
- ✅ `src/app/api/pagamentos/create/route.ts` - refatorada
- ✅ `src/app/api/pagamentos/atualiza-pagamento/route.ts` - refatorada
- ✅ `src/app/api/pagamentos/verify/route.ts` - refatorada
- ✅ `src/app/api/custos/create/route.ts` - refatorada
- ✅ `src/app/api/custos/atualiza-custo/route.ts` - refatorada
- ✅ `src/app/api/tipos-custo/create/route.ts` - refatorada
- ✅ `src/app/api/servicos/atualiza-servico/route.ts` - refatorada
- ✅ `src/app/api/alterar-plano/route.ts` - refatorada
- ✅ `src/app/api/users/[id]/assinatura/route.ts` - refatorada
- ✅ `src/app/api/arquivos/route.ts` - refatorada
- ✅ `src/app/api/comprovantes/route.ts` - refatorada
- ✅ `src/app/api/upload/route.ts` - refatorada
- ✅ `src/app/api/upload-comprovante/route.ts` - refatorada

---

## ✅ FASE 5: COMPLETA

### Rotas Refatoradas ✅
- ✅ `src/app/api/webhooks/hotmart/route.ts` - refatorada (POST, GET)
- ✅ `src/app/api/google-calendar/auth/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/callback/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/status/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/disconnect/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/toggle-sync/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/refresh-token/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/events/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/debug/route.ts` - refatorada
- ✅ `src/app/api/google-calendar/detailed-status/route.ts` - refatorada
- ✅ `src/app/api/auth/reset-password/route.ts` - refatorada
- ✅ `src/app/api/auth/reset-password-custom/route.ts` - refatorada
- ✅ `src/app/api/auth/resolve-reset-token/route.ts` - refatorada
- ✅ `src/app/api/auth/verify-reset-code/route.ts` - refatorada
- ✅ `src/app/api/auth/confirm-reset-password/route.ts` - refatorada

### Rotas Não Verificadas (Baixa Prioridade)
- ⚠️ `src/app/api/webhooks/hotmart/mock/route.ts` - não verificada (rota de teste)
- ⚠️ `src/app/api/webhooks/hotmart/sandbox/route.ts` - não verificada (rota de teste)

---

## ❌ FASE 6: ROTAS ADMIN (NÃO INICIADA)

### Rotas Pendentes
- ❌ `src/app/api/admin/adicionar-assinatura-usuarios-sem-plano/route.ts`
- ❌ `src/app/api/admin/atualizar-planos-usuarios/route.ts`
- ❌ `src/app/api/admin/create-default-admin/route.ts`
- ❌ `src/app/api/admin/create-sandbox-plan/route.ts`
- ❌ `src/app/api/admin/create-user/route.ts` - usa Firebase diretamente (não usa factories)
- ❌ `src/app/api/admin/migrate-data-integrity-fields/route.ts`
- ❌ `src/app/api/admin/migrate-enterprise-to-premium/route.ts`
- ❌ `src/app/api/admin/migrate-user-assinatura-structure/route.ts`
- ❌ `src/app/api/admin/migrate-users-to-plans/route.ts`

**Nota**: Rotas admin podem ter lógica especial e podem não precisar de refatoração completa, mas devem usar `requireAdmin()` e factories quando possível.

---

## ❌ FASE 7: ROTAS DE INICIALIZAÇÃO E SEED (NÃO INICIADA)

### Rotas Pendentes
- ❌ `src/app/api/init/canais-entrada/route.ts` - usa `getServerSession` diretamente
- ❌ `src/app/api/init/tipos-evento/route.ts`
- ❌ `src/app/api/init/tipos-servico/route.ts`
- ❌ `src/app/api/seed/funcionalidades-planos/route.ts`
- ❌ `src/app/api/seed/modelos-contrato/route.ts`

---

## ❌ FASE 8: ROTAS DE MIGRAÇÃO E DEBUG (NÃO INICIADA)

### Rotas Pendentes
- ❌ `src/app/api/migrar-anexos-temp/route.ts`
- ❌ `src/app/api/debug/funcionalidades/route.ts`
- ❌ `src/app/api/test/generate-events/route.ts`

**Nota**: Rotas de migração e debug podem ser mantidas como estão ou removidas após migração completa.

---

## 📊 ESTATÍSTICAS ATUALIZADAS

### Rotas Refatoradas ✅
- **Fase 1**: ✅ 100% completa (ServiceFactory, Route Helpers, Serviços)
- **Fase 2**: ✅ 100% completa (Planos, Assinaturas, Funcionalidades)
- **Fase 3**: ✅ 100% completa (Contratos e Modelos)
- **Fase 4**: ✅ 100% completa (14/14 rotas)
- **Fase 5**: ✅ 100% completa (15/15 rotas principais)

### Rotas Pendentes ❌
- **Fase 6**: 9 rotas (admin) - prioridade média
- **Fase 7**: 5 rotas (init, seed) - prioridade baixa
- **Fase 8**: 3 rotas (migração, debug, test) - prioridade baixa

**Total**: 
- ✅ **Rotas refatoradas**: ~50 rotas principais
- ❌ **Rotas pendentes**: ~17 rotas (admin, migração, debug, init, seed)
- **Progresso geral**: ~75% das rotas principais completas

### Build Status
- ✅ Build funcionando sem erros
- ✅ ServiceFactory funcionando
- ✅ Route helpers funcionando
- ✅ Padrão consistente nas rotas refatoradas

---

## 🚀 PRÓXIMOS PASSOS RECOMENDADOS

### Prioridade ALTA
1. ✅ Completar Fase 4 - refatorar rotas de pagamentos, custos e serviços pendentes
2. ✅ Completar Fase 5 - refatorar rotas de Google Calendar debug e auth custom

### Prioridade MÉDIA
3. Refatorar rotas admin (Fase 6) - usar `requireAdmin()` e factories quando possível
4. Refatorar rotas de inicialização (Fase 7) - usar route-helpers

### Prioridade BAIXA
5. Rotas de migração e debug (Fase 8) - avaliar se devem ser mantidas ou removidas
6. Documentar padrões finais
7. Criar exemplos de uso para novos desenvolvedores

---

## ✅ MIGRAÇÃO DE SUBCOLLECTIONS: COMPLETA

### Data: 2025-01-XX

### Problema Identificado
Os custos e pagamentos dos eventos não foram migrados corretamente do Firestore para o Supabase porque:
- O script original buscava de collections globais que não existem
- Os dados estão em subcollections de eventos: `controle_users/{userId}/eventos/{eventoId}/pagamentos`
- As tabelas tinham RLS habilitado durante a migração inicial

### Solução Implementada

#### 1. Script de Migração Criado
- ✅ Arquivo: `supabase/migrate-user-subcollections.ts`
- ✅ Migra subcollections de um usuário específico:
  - `pagamentos` (de `eventos/{eventoId}/pagamentos`)
  - `custos` (de `eventos/{eventoId}/custos`)
  - `servicos` (de `eventos/{eventoId}/servicos`)
  - `anexos_eventos` (de `eventos/{eventoId}/controle_anexos_eventos`)
  - `canais_entrada` (de `controle_users/{userId}/canais_entrada`)

#### 2. Rota API Criada
- ✅ Arquivo: `src/app/api/admin/migrate-user-subcollections/route.ts`
- ✅ Endpoint: `POST /api/admin/migrate-user-subcollections`
- ✅ Autenticação: API key via header `x-api-key` ou sessão admin
- ✅ Body: `{ "userId": "1AGkVjDbaqWOwk5tg3mHje11PaD2" }`

#### 3. Características do Script
- ✅ Usa `SUPABASE_SERVICE_ROLE_KEY` para bypassar RLS
- ✅ Insere apenas novos registros (não faz upsert)
- ✅ Verifica existência antes de inserir (evita duplicatas)
- ✅ Extrai `userId` e `eventoId` do path do Firestore
- ✅ Converte Timestamps do Firestore para ISO strings
- ✅ Estatísticas detalhadas de migração

### Como Usar

#### Via Postman/API:
```bash
POST http://localhost:3000/api/admin/migrate-user-subcollections
Headers:
  x-api-key: <SEED_API_KEY>
Body:
  {
    "userId": "1AGkVjDbaqWOwk5tg3mHje11PaD2"
  }
```

#### Via CLI:
```bash
npx tsx supabase/migrate-user-subcollections.ts 1AGkVjDbaqWOwk5tg3mHje11PaD2
```

### Arquivos Criados/Modificados
- ✅ `supabase/migrate-user-subcollections.ts` - Script de migração
- ✅ `src/app/api/admin/migrate-user-subcollections/route.ts` - Rota API

### Próximos Passos
1. Testar migração com usuário `1AGkVjDbaqWOwk5tg3mHje11PaD2`
2. Verificar dados migrados no Supabase
3. Executar para outros usuários se necessário

