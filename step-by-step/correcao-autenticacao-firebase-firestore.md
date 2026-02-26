# Correção de Autenticação Firebase/Firestore

**Data**: 2025-01-XX  
**Problema**: Após alterar as regras de segurança do Firestore para exigir autenticação, o sistema mostrava que o usuário não tinha plano mesmo tendo um plano ativo.

---

## 🎯 PROBLEMA IDENTIFICADO

Após alterar as regras de segurança do Firestore de:
```javascript
// Regras antigas (públicas para teste)
match /{document=**} {
  allow read, write: if true;
}
```

Para:
```javascript
// Regras novas (exigem autenticação)
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

O sistema começou a mostrar o banner "Assine um plano para desbloquear todas as funcionalidades" mesmo quando o usuário já tinha um plano ativo.

### Causa Raiz

O problema ocorreu porque:
1. O sistema usa **NextAuth** para autenticação (gerenciamento de sessão)
2. O login é feito no **servidor** usando `signInWithEmailAndPassword` do Firebase Auth
3. No entanto, o **Firebase Client SDK** no navegador não mantém a sessão autenticada
4. Quando os serviços tentam acessar o Firestore no cliente (ex: `usePlano` hook), as regras de segurança bloqueiam porque `request.auth` é `null`

---

## ✅ SOLUÇÃO IMPLEMENTADA

Criamos um sistema de sincronização entre NextAuth e Firebase Auth no cliente:

### 1. API Route para Gerar Custom Token

**Arquivo**: `src/app/api/auth/firebase-token/route.ts`

Esta API route:
- Verifica se o usuário está autenticado no NextAuth
- Usa o Firebase Admin SDK para criar um custom token
- Retorna o token para o cliente fazer login no Firebase Auth

**Função**: Permite que o cliente faça login no Firebase Auth sem precisar da senha do usuário.

### 2. Provider de Sincronização

**Arquivo**: `src/components/providers/FirebaseAuthProvider.tsx`

Este provider:
- Monitora a sessão do NextAuth
- Quando o usuário está autenticado, obtém um custom token da API
- Faz login no Firebase Auth usando `signInWithCustomToken`
- Mantém o Firebase Auth sincronizado com o NextAuth
- Faz logout do Firebase Auth quando o usuário faz logout do NextAuth

**Função**: Garante que o Firebase Auth no cliente esteja sempre sincronizado com o NextAuth.

### 3. Integração no Layout

**Arquivo**: `src/app/layout.tsx`

Adicionamos o `FirebaseAuthProvider` dentro do `SessionProvider` para que ele tenha acesso à sessão do NextAuth.

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### Arquivos Criados

1. **`src/app/api/auth/firebase-token/route.ts`**
   - API route que gera custom tokens do Firebase Admin
   - Verifica autenticação do NextAuth
   - Retorna token para o cliente

2. **`src/components/providers/FirebaseAuthProvider.tsx`**
   - Provider React que sincroniza Firebase Auth com NextAuth
   - Monitora mudanças na sessão
   - Gerencia login/logout automático

### Arquivos Modificados

1. **`src/app/layout.tsx`**
   - Adicionado import do `FirebaseAuthProvider`
   - Adicionado `FirebaseAuthProvider` dentro do `SessionProvider`

---

## 🔧 COMO FUNCIONA

### Fluxo de Autenticação

1. **Login do Usuário**:
   - Usuário faz login via NextAuth (página de login)
   - NextAuth autentica com Firebase Auth no servidor
   - Sessão do NextAuth é criada

2. **Sincronização no Cliente**:
   - `FirebaseAuthProvider` detecta que o usuário está autenticado
   - Faz requisição para `/api/auth/firebase-token`
   - API route cria custom token usando Firebase Admin
   - Provider faz login no Firebase Auth usando `signInWithCustomToken`
   - Agora o Firebase Auth no cliente está autenticado

3. **Acesso ao Firestore**:
   - Quando os serviços acessam o Firestore (ex: `AssinaturaService.obterStatusPlanoUsuario`)
   - As regras de segurança verificam `request.auth != null`
   - Como o Firebase Auth está autenticado, `request.auth` não é null
   - Acesso permitido ✅

4. **Logout**:
   - Quando o usuário faz logout do NextAuth
   - `FirebaseAuthProvider` detecta a mudança
   - Faz logout do Firebase Auth automaticamente

---

## 🎯 RESULTADO ESPERADO

Após esta correção:
- ✅ O banner de plano não aparece mais quando o usuário tem um plano ativo
- ✅ As regras de segurança do Firestore funcionam corretamente
- ✅ O sistema consegue verificar o plano do usuário sem erros
- ✅ A autenticação está sincronizada entre NextAuth e Firebase Auth

---

## 🔍 VERIFICAÇÃO

Para verificar se está funcionando:

1. **Console do Navegador**: Deve aparecer logs como:
   ```
   [FirebaseAuthProvider] Firebase Auth sincronizado com sucesso
   [FirebaseAuthProvider] Usuário autenticado no Firebase Auth: <userId>
   ```

2. **Banner de Plano**: Não deve aparecer quando o usuário tem plano ativo

3. **Funcionalidades**: Devem funcionar normalmente sem bloqueios indevidos

---

## 📝 NOTAS TÉCNICAS

### Por que Custom Token?

- Custom tokens são criados pelo Firebase Admin SDK
- Permitem fazer login no Firebase Auth sem senha
- São seguros porque só podem ser criados no servidor (com credenciais do Admin)
- Expirem após um tempo, mas o Firebase Auth renova automaticamente

### Por que não usar Firebase Auth diretamente?

- O sistema já usa NextAuth para gerenciamento de sessão
- NextAuth oferece melhor integração com Next.js
- Permite usar múltiplos providers de autenticação
- Mantém compatibilidade com o código existente

### Segurança

- A API route verifica autenticação do NextAuth antes de criar o token
- Custom tokens são gerados apenas para usuários autenticados
- Tokens expiram automaticamente
- Firebase Admin SDK tem acesso total, mas só é usado no servidor

---

## 🚀 PRÓXIMOS PASSOS

1. Testar o sistema em diferentes cenários:
   - Login/logout
   - Refresh da página
   - Múltiplas abas
   - Expiração de sessão

2. Monitorar logs para garantir que a sincronização está funcionando

3. Considerar adicionar tratamento de erros mais robusto se necessário

---

## 📚 REFERÊNCIAS

- [Firebase Admin SDK - Custom Tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Firebase Auth - signInWithCustomToken](https://firebase.google.com/docs/auth/web/custom-auth)
- [NextAuth.js Documentation](https://next-auth.js.org/)

