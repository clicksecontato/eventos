# Plano de Refatoração: Clean Code e SOLID

## Data: 2025-01-XX
## Modo: Planejador

---

## 🎯 OBJETIVO

Refatorar a estrutura do projeto para seguir princípios de **Clean Code** e **SOLID**, priorizando:
1. Padronizar injeção de dependências nas rotas API
2. Facilitar testes unitários
3. Manter compatibilidade total durante a transição
4. Melhorar manutenibilidade e escalabilidade

---

## 📊 ANÁLISE DA SITUAÇÃO ATUAL

### Estatísticas
- **73 rotas API** instanciam repositórios/serviços diretamente (`new Repository()`)
- **47 rotas API** já usam `repositoryFactory`
- **0 estrutura de testes** identificada
- **Arquivos grandes**: `DataService` (1235 linhas), `HotmartWebhookService` (821 linhas)

### Problemas Identificados

#### 1. Violações de SOLID
- **SRP**: `DataService` com múltiplas responsabilidades
- **DIP**: Serviços e rotas instanciam dependências diretamente
- **OCP**: `RepositoryFactory` difícil de estender

#### 2. Violações de Clean Code
- Duplicação de código (instanciação, autenticação, tratamento de erros)
- Arquivos muito grandes
- Inconsistência entre rotas

---

## 💡 RECOMENDAÇÕES ESTRATÉGICAS

### 1. Estratégia de Injeção de Dependências

**Recomendação: Melhorar o Factory Pattern existente**

**Justificativa:**
- ✅ Já existe `RepositoryFactory` funcionando
- ✅ Não adiciona dependências externas pesadas
- ✅ Mantém compatibilidade com código existente
- ✅ Facilita testes (pode criar factories mock)
- ✅ Mais simples que DI containers (InversifyJS, TSyringe)
- ✅ Adequado para projetos Next.js

**Implementação:**
- Criar `ServiceFactory` similar ao `RepositoryFactory`
- Adicionar métodos para obter serviços
- Manter singleton pattern
- Permitir injeção de dependências para testes

### 2. Organização de Diretórios

**Recomendação: Manter estrutura por tipo, mas melhorar organização**

**Justificativa:**
- ✅ Estrutura atual já está estabelecida
- ✅ Migração para features seria muito disruptiva
- ✅ Pode melhorar sem quebrar compatibilidade
- ✅ Estrutura por tipo facilita encontrar código relacionado

**Melhorias:**
- Manter `src/lib/repositories/` e `src/lib/services/`
- Adicionar `src/lib/factories/` para centralizar factories
- Criar `src/lib/api/` para helpers de rotas API
- Organizar scripts em `scripts/` por categoria

---

## 📋 PLANO DE AÇÃO DETALHADO

### FASE 1: Criar ServiceFactory e Padronizar Dependências
**Prioridade: ALTA** | **Estimativa: 2-3 dias**

#### 1.1 Criar ServiceFactory
- [ ] Criar `src/lib/factories/service-factory.ts`
- [ ] Implementar singleton pattern
- [ ] Adicionar métodos getter para todos os serviços
- [ ] Permitir injeção de dependências (para testes)

#### 1.2 Atualizar Serviços para Usar Factory
- [ ] Refatorar `PlanoService` para receber dependências via construtor
- [ ] Refatorar `AssinaturaService` para receber dependências via construtor
- [ ] Refatorar `FuncionalidadeService` para receber dependências via construtor
- [ ] Manter compatibilidade com construtores sem parâmetros (usar factory internamente)

#### 1.3 Criar Helpers para Rotas API
- [ ] Criar `src/lib/api/route-helpers.ts` com:
  - `getAuthenticatedUser()` - validação de sessão
  - `handleApiError()` - tratamento de erros padronizado
  - `createApiResponse()` - resposta padronizada
- [ ] Criar tipos para requests/responses

**Arquivos a Criar:**
```
src/lib/factories/
  └── service-factory.ts

src/lib/api/
  └── route-helpers.ts
  └── types.ts
```

**Arquivos a Modificar:**
```
src/lib/services/plano-service.ts
src/lib/services/assinatura-service.ts
src/lib/services/funcionalidade-service.ts
```

---

### FASE 2: Padronizar Rotas API - Parte 1 (Rotas Simples)
**Prioridade: ALTA** | **Estimativa: 3-4 dias**

#### 2.1 Refatorar Rotas de Planos
- [ ] `src/app/api/planos/route.ts`
- [ ] `src/app/api/planos/[id]/route.ts`
- [ ] Usar `serviceFactory` e `route-helpers`

#### 2.2 Refatorar Rotas de Assinaturas
- [ ] `src/app/api/assinaturas/route.ts`
- [ ] Usar `serviceFactory` e `route-helpers`

#### 2.3 Refatorar Rotas de Funcionalidades
- [ ] `src/app/api/funcionalidades/route.ts`
- [ ] `src/app/api/funcionalidades/[id]/route.ts`
- [ ] Usar `serviceFactory` e `route-helpers`

**Padrão a Seguir:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { serviceFactory } from '@/lib/factories/service-factory';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { getAuthenticatedUser, handleApiError, createApiResponse } from '@/lib/api/route-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    const service = serviceFactory.getPlanoService();
    const planos = await service.obterTodosPlanos();
    
    return createApiResponse({ planos });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

### FASE 3: Padronizar Rotas API - Parte 2 (Rotas com RepositoryFactory)
**Prioridade: ALTA** | **Estimativa: 3-4 dias**

#### 3.1 Refatorar Rotas de Contratos
- [ ] `src/app/api/contratos/route.ts`
- [ ] `src/app/api/contratos/[id]/route.ts`
- [ ] `src/app/api/contratos/[id]/gerar-pdf/route.ts`
- [ ] Usar `repositoryFactory` e `route-helpers`

#### 3.2 Refatorar Rotas de Modelos de Contrato
- [ ] `src/app/api/modelos-contrato/route.ts`
- [ ] Usar `repositoryFactory` e `route-helpers`

#### 3.3 Refatorar Rotas de Configuração de Contrato
- [ ] `src/app/api/configuracao-contrato/route.ts`
- [ ] `src/app/api/configuracao-contrato/campos-fixos/route.ts`
- [ ] Usar `repositoryFactory` e `route-helpers`

---

### FASE 4: Padronizar Rotas API - Parte 3 (Rotas Complexas)
**Prioridade: MÉDIA** | **Estimativa: 4-5 dias**

#### 4.1 Refatorar Rotas de Eventos
- [ ] Rotas que usam `repositoryFactory.getEventoRepository()`
- [ ] Usar `route-helpers` para padronização

#### 4.2 Refatorar Rotas de Clientes
- [ ] Rotas que usam `repositoryFactory.getClienteRepository()`
- [ ] Usar `route-helpers` para padronização

#### 4.3 Refatorar Rotas de Pagamentos, Custos, Serviços
- [ ] Rotas de criação e atualização
- [ ] Usar `route-helpers` para padronização

---

### FASE 5: Refatorar Rotas Especiais (Webhooks, Google Calendar, etc.)
**Prioridade: MÉDIA** | **Estimativa: 3-4 dias**

#### 5.1 Refatorar Rotas de Webhooks
- [ ] `src/app/api/webhooks/hotmart/route.ts`
- [ ] Usar `serviceFactory` para `HotmartWebhookService`

#### 5.2 Refatorar Rotas de Google Calendar
- [ ] Todas as rotas em `src/app/api/google-calendar/`
- [ ] Usar `serviceFactory` para `GoogleCalendarService`

#### 5.3 Refatorar Rotas de Autenticação
- [ ] `src/app/api/auth/reset-password/route.ts`
- [ ] `src/app/api/auth/reset-password-custom/route.ts`
- [ ] Usar `repositoryFactory` e `route-helpers`

---

### FASE 6: Melhorar RepositoryFactory (Opcional - Futuro)
**Prioridade: BAIXA** | **Estimativa: 2-3 dias**

#### 6.1 Tornar RepositoryFactory Mais Extensível
- [ ] Criar interface `IRepositoryFactory`
- [ ] Permitir registro dinâmico de repositórios
- [ ] Manter compatibilidade com código existente

**Nota:** Esta fase pode ser feita no futuro, quando necessário adicionar novos repositórios.

---

### FASE 7: Preparar Estrutura para Testes
**Prioridade: MÉDIA** | **Estimativa: 2 dias**

#### 7.1 Criar Estrutura de Testes
- [ ] Configurar Jest/Vitest
- [ ] Criar `src/__tests__/` ou `src/**/*.test.ts`
- [ ] Criar factories mock para testes
- [ ] Criar helpers de teste

#### 7.2 Criar Factories Mock
- [ ] `src/lib/factories/mock-repository-factory.ts`
- [ ] `src/lib/factories/mock-service-factory.ts`
- [ ] Permitir injeção de mocks nos factories

**Arquivos a Criar:**
```
src/lib/factories/
  └── mock-repository-factory.ts
  └── mock-service-factory.ts

src/__tests__/
  └── setup.ts
  └── helpers/
      └── test-helpers.ts
```

---

## 🔄 ESTRATÉGIA DE COMPATIBILIDADE

### Manter Compatibilidade Durante Transição

1. **Serviços com Construtores Duplos:**
```typescript
export class PlanoService {
  constructor(
    private planoRepo?: PlanoRepository,
    private funcionalidadeRepo?: FuncionalidadeRepository,
    // ... outras dependências
  ) {
    // Se não passou dependências, usar factory
    this.planoRepo = planoRepo || repositoryFactory.getPlanoRepository();
    // ...
  }
}
```

2. **Rotas Graduais:**
- Refatorar uma rota por vez
- Testar cada rota após refatoração
- Manter código antigo comentado temporariamente (se necessário)

3. **Factory com Fallback:**
- Factory pode criar instâncias novas ou retornar singletons
- Permitir injeção para testes

---

## 📁 ESTRUTURA FINAL PROPOSTA

```
src/
├── lib/
│   ├── factories/
│   │   ├── repository-factory.ts (melhorado)
│   │   ├── service-factory.ts (novo)
│   │   ├── mock-repository-factory.ts (novo - testes)
│   │   └── mock-service-factory.ts (novo - testes)
│   ├── api/
│   │   ├── route-helpers.ts (novo)
│   │   └── types.ts (novo)
│   ├── repositories/
│   │   ├── supabase/
│   │   └── ... (mantém estrutura atual)
│   └── services/
│       └── ... (mantém estrutura atual)
├── app/
│   └── api/
│       └── ... (rotas refatoradas)
└── __tests__/
    ├── setup.ts
    └── helpers/
        └── test-helpers.ts
```

---

## ✅ CRITÉRIOS DE SUCESSO

### Fase 1-5 (Padronização)
- [ ] Todas as rotas API usam factories
- [ ] Todas as rotas API usam `route-helpers`
- [ ] Tratamento de erros consistente
- [ ] Autenticação padronizada
- [ ] Zero instâncias diretas de `new Repository()` ou `new Service()` nas rotas API

### Fase 7 (Testes)
- [ ] Estrutura de testes configurada
- [ ] Factories mock criados
- [ ] Pelo menos 1 exemplo de teste unitário para serviço
- [ ] Pelo menos 1 exemplo de teste unitário para rota API

### Geral
- [ ] Build passa sem erros
- [ ] Aplicação funciona normalmente
- [ ] Código mais fácil de testar
- [ ] Código mais fácil de manter

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Quebrar Funcionalidades Existentes
**Mitigação:**
- Refatorar uma rota por vez
- Testar cada rota após refatoração
- Manter compatibilidade com construtores antigos

### Risco 2: Aumentar Complexidade
**Mitigação:**
- Manter factories simples
- Documentar padrões claramente
- Criar exemplos de uso

### Risco 3: Tempo de Desenvolvimento
**Mitigação:**
- Priorizar rotas mais usadas primeiro
- Fazer em fases incrementais
- Não refatorar tudo de uma vez

---

## 📝 PRÓXIMOS PASSOS

1. **Aprovar este plano**
2. **Iniciar Fase 1** (ServiceFactory e Helpers)
3. **Testar Fase 1** em ambiente de desenvolvimento
4. **Continuar com Fases 2-5** incrementalmente
5. **Implementar Fase 7** quando necessário

---

## 🔍 NOTAS TÉCNICAS

### ServiceFactory - Exemplo de Implementação

```typescript
export class ServiceFactory {
  private static instance: ServiceFactory;
  
  private planoService: PlanoService;
  private assinaturaService: AssinaturaService;
  // ... outros serviços
  
  private constructor() {
    // Inicializar serviços com dependências do repositoryFactory
    this.planoService = new PlanoService(
      repositoryFactory.getPlanoRepository(),
      repositoryFactory.getFuncionalidadeRepository(),
      repositoryFactory.getAssinaturaRepository(),
      repositoryFactory.getUserRepository()
    );
    // ...
  }
  
  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }
  
  public getPlanoService(): PlanoService {
    return this.planoService;
  }
  
  // ... outros getters
}
```

### Route Helpers - Exemplo

```typescript
export async function getAuthenticatedUser(): Promise<{ id: string; role?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError('Não autenticado', 401);
  }
  return { id: session.user.id, role: session.user.role };
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  
  console.error('Erro não tratado:', error);
  return NextResponse.json(
    { error: 'Erro interno do servidor' },
    { status: 500 }
  );
}
```

---

## 📚 REFERÊNCIAS

- SOLID Principles
- Clean Code (Robert C. Martin)
- Factory Pattern
- Dependency Injection
- Next.js API Routes Best Practices

