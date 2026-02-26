# Correção de Webhooks Hotmart com Regras do Firestore

**Data**: 2025-01-XX  
**Problema**: Após alterar as regras de segurança do Firestore para exigir autenticação, os endpoints de webhook da Hotmart estavam retornando erro "Missing or insufficient permissions."

---

## 🎯 PROBLEMA IDENTIFICADO

Após alterar as regras de segurança do Firestore para exigir autenticação:
```javascript
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

Os seguintes endpoints de webhook começaram a falhar:
- `/api/webhooks/hotmart/mock`
- `/api/webhooks/hotmart/sandbox`
- `/api/webhooks/hotmart` (endpoint principal)

### Causa Raiz

O problema ocorreu porque:
1. Os webhooks são executados no **servidor** (API routes)
2. Os serviços estavam usando repositórios que usam **Firebase Client SDK**
3. O Client SDK está sujeito às regras de segurança do Firestore
4. No servidor, não há um usuário autenticado no Firebase Auth
5. As regras bloqueiam o acesso porque `request.auth` é `null`

**Solução**: No servidor, devemos usar o **Firebase Admin SDK**, que bypassa as regras de segurança do Firestore.

---

## ✅ SOLUÇÃO IMPLEMENTADA

Atualizamos todos os endpoints de webhook para usar repositórios Admin que usam o Firebase Admin SDK.

### 1. Endpoint Mock

**Arquivo**: `src/app/api/webhooks/hotmart/mock/route.ts`

**Antes**:
```typescript
import { UserRepository } from '@/lib/repositories/user-repository';
import { AssinaturaRepository } from '@/lib/repositories/assinatura-repository';
import { PlanoRepository } from '@/lib/repositories/plano-repository';

const service = new HotmartWebhookService(); // ❌ Usa Client SDK
```

**Depois**:
```typescript
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { PlanoService } from '@/lib/services/plano-service';

// Usar repositórios Admin que bypassam as regras de segurança
const userRepo = new AdminUserRepository();
const planoRepo = new AdminPlanoRepository();
const assinaturaRepo = new AdminAssinaturaRepository();
const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
const planoService = new PlanoService(planoRepo);
const service = new HotmartWebhookService(assinaturaRepo, planoRepo, userRepo, planoService, assinaturaService); // ✅ Usa Admin SDK
```

### 2. Endpoint Sandbox

**Arquivo**: `src/app/api/webhooks/hotmart/sandbox/route.ts`

Mesma correção aplicada - alterado para usar repositórios Admin.

### 3. Endpoint Principal

**Arquivo**: `src/app/api/webhooks/hotmart/route.ts`

**Antes**:
```typescript
const { getServiceFactory } = await import('@/lib/factories/service-factory');
const serviceFactory = getServiceFactory();
const service = serviceFactory.getHotmartWebhookService(); // ❌ Usa Client SDK via ServiceFactory
```

**Depois**:
```typescript
// Usar repositórios Admin que bypassam as regras de segurança do Firestore
const userRepo = new AdminUserRepository();
const planoRepo = new AdminPlanoRepository();
const assinaturaRepo = new AdminAssinaturaRepository();
const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
const planoService = new PlanoService(planoRepo);
const service = new HotmartWebhookService(assinaturaRepo, planoRepo, userRepo, planoService, assinaturaService); // ✅ Usa Admin SDK
```

---

## 📁 ARQUIVOS MODIFICADOS

1. **`src/app/api/webhooks/hotmart/mock/route.ts`**
   - Alterado para usar repositórios Admin
   - Passa repositórios Admin para o `HotmartWebhookService`

2. **`src/app/api/webhooks/hotmart/sandbox/route.ts`**
   - Alterado para usar repositórios Admin
   - Passa repositórios Admin para o `HotmartWebhookService`

3. **`src/app/api/webhooks/hotmart/route.ts`**
   - Alterado para usar repositórios Admin diretamente
   - Removida dependência do ServiceFactory para webhooks
   - Aplicado tanto no método POST quanto no GET

---

## 🔧 COMO FUNCIONA

### Por que Webhooks Precisam de Admin SDK?

**Webhooks são executados no servidor**:
- Recebem requisições HTTP da Hotmart
- Não há usuário autenticado no Firebase Auth
- Precisam acessar o Firestore para processar eventos
- Devem bypassar regras de segurança

**Fluxo de um Webhook**:
1. Hotmart envia requisição HTTP para o endpoint
2. Endpoint valida HMAC (se configurado)
3. Endpoint processa o payload do webhook
4. Serviço precisa acessar Firestore:
   - Buscar usuário por email
   - Buscar/criar assinatura
   - Atualizar plano do usuário
5. Com Admin SDK, todas essas operações funcionam sem erros de permissão ✅

### Diferença entre Client SDK e Admin SDK

**Client SDK** (`firebase/firestore`):
- Usado no cliente (navegador)
- Sujeito às regras de segurança
- Requer autenticação do usuário
- ❌ Não funciona em webhooks (sem usuário autenticado)

**Admin SDK** (`firebase-admin/firestore`):
- Usado apenas no servidor
- **Bypassa** as regras de segurança
- Não requer autenticação do usuário
- ✅ Funciona perfeitamente em webhooks

---

## 🎯 RESULTADO ESPERADO

Após esta correção:
- ✅ Todos os endpoints de webhook funcionam corretamente mesmo com regras de segurança ativas
- ✅ Não há mais erros de "Missing or insufficient permissions"
- ✅ Webhooks podem processar eventos da Hotmart sem problemas
- ✅ Mock e sandbox funcionam para testes

---

## 🔍 VERIFICAÇÃO

Para verificar se está funcionando:

1. **Testar endpoint mock**:
   ```bash
   POST /api/webhooks/hotmart/mock?event=SWITCH_PLAN&email=usuario@exemplo.com&new_plan_code=PROFISSIONAL_MENSAL
   ```

2. **Testar endpoint sandbox**:
   ```bash
   POST /api/webhooks/hotmart/sandbox
   Body: { payload do webhook }
   ```

3. **Verificar resposta**:
   - Deve retornar sucesso
   - Não deve ter erro de permissões
   - Deve processar o webhook corretamente

---

## 📝 NOTAS TÉCNICAS

### Por que não usar ServiceFactory nos Webhooks?

O `ServiceFactory` cria serviços com repositórios padrão (Client SDK) via `RepositoryFactory`. Para webhooks, precisamos de Admin SDK, então criamos os serviços diretamente com repositórios Admin.

### Segurança

- Webhooks devem validar HMAC quando possível
- Repositórios Admin só devem ser usados no servidor
- Nunca exponha Admin SDK no cliente
- Webhooks são executados em contexto administrativo (aceitável usar Admin SDK)

### Compatibilidade

- Os repositórios Admin implementam a mesma interface dos repositórios normais
- Os serviços funcionam com ambos os tipos de repositórios
- Não há quebra de compatibilidade

---

## 🚀 PRÓXIMOS PASSOS

1. Verificar se há outros endpoints que precisam de Admin SDK
2. Considerar criar uma versão Admin do ServiceFactory se necessário
3. Documentar quais endpoints devem usar Admin SDK

---

## 📚 REFERÊNCIAS

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Hotmart Webhooks Documentation](https://developers.hotmart.com/docs/pt-BR/webhooks/)

