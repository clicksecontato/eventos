# Debug - Migração Supabase

## Como verificar qual banco está sendo usado

### 1. Verificar logs no console do navegador

Abra o DevTools (F12) e procure por:
- `[RepositoryFactory]` - Mostra qual banco está sendo usado
- `[DataService]` - Confirma qual banco o DataService está usando

### 2. Verificar variáveis de ambiente

No terminal, execute:
```bash
grep -E "USE_SUPABASE|NEXT_PUBLIC_SUPABASE" .env.local
```

Deve mostrar:
```
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**⚠️ IMPORTANTE**: Use `NEXT_PUBLIC_USE_SUPABASE` (não `USE_SUPABASE`) para funcionar no cliente Next.js.

### 3. Reiniciar o servidor

**IMPORTANTE**: Após alterar variáveis de ambiente, você DEVE reiniciar o servidor Next.js:

```bash
# Parar o servidor (Ctrl+C)
# Depois iniciar novamente
npm run dev
```

### 4. Verificar no código

Adicione este código temporariamente em qualquer página para verificar:

```typescript
import { repositoryFactory } from '@/lib/repositories/repository-factory';

console.log('Usando Supabase?', repositoryFactory.isUsingSupabase());
```

### 5. Possíveis problemas

#### Problema: Variáveis não estão sendo lidas
**Solução**: 
- Verifique se o arquivo é `.env.local` (não `.env`)
- Reinicie o servidor Next.js
- No Next.js, variáveis `NEXT_PUBLIC_*` precisam estar disponíveis no build/runtime

#### Problema: Ainda está usando Firebase
**Solução**:
1. Verifique se `USE_SUPABASE=true` (não `USE_SUPABASE="true"` ou `USE_SUPABASE='true'`)
2. Verifique se as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão configuradas
3. Reinicie o servidor completamente
4. Limpe o cache: `rm -rf .next` e reinicie

#### Problema: Erro ao inicializar Supabase
**Solução**:
- Verifique se o schema foi executado no Supabase
- Verifique se as variáveis estão corretas
- Veja os logs no console para o erro específico

### 6. Teste rápido

Crie um arquivo `test-db.ts` temporário:

```typescript
// test-db.ts
import { repositoryFactory } from './lib/repositories/repository-factory';

console.log('=== DEBUG BANCO DE DADOS ===');
console.log('USE_SUPABASE:', process.env.USE_SUPABASE);
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('Usando Supabase?', repositoryFactory.isUsingSupabase());
console.log('===========================');
```

Execute no servidor e veja os logs.

