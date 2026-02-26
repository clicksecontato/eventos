# Solução para Problemas de RLS na Inicialização de Dados Padrão

## Problema Identificado

O sistema estava apresentando erros ao tentar criar dados padrão (tipos de serviço e tipos de evento) quando usando Supabase:

```
Error: new row violates row-level security policy for table "tipo_servicos"
POST https://...supabase.co/rest/v1/tipo_servicos?select=* 401 (Unauthorized)
```

### Causa

1. **Row Level Security (RLS) ativo**: O Supabase tem RLS habilitado nas tabelas para garantir segurança
2. **Autenticação no cliente**: O código estava tentando criar dados diretamente do navegador usando a chave anon
3. **Falta de sessão Supabase**: O usuário está autenticado via NextAuth/Firebase, mas não há sessão ativa no Supabase
4. **Políticas RLS bloqueando**: As políticas RLS exigem que o usuário esteja autenticado no Supabase para criar registros

## Solução Implementada

Criamos **API routes no servidor** que usam o **cliente admin do Supabase** (service role key) para criar os dados padrão, contornando o RLS de forma segura.

### Arquivos Criados

1. **`src/app/api/init/tipos-servico/route.ts`**
   - API route para inicializar tipos de serviço padrão
   - Usa cliente admin do Supabase quando necessário
   - Funciona tanto para Supabase quanto Firebase

2. **`src/app/api/init/tipos-evento/route.ts`**
   - API route para inicializar tipos de evento padrão
   - Usa cliente admin do Supabase quando necessário
   - Funciona tanto para Supabase quanto Firebase

### Modificações no DataService

O `DataService` foi modificado para:

1. **Detectar quando está usando Supabase no cliente**
2. **Chamar a API route automaticamente** quando detectar Supabase + cliente
3. **Fallback para método direto** caso a API route falhe ou esteja no servidor
4. **Tratamento de erros RLS** - se receber erro de RLS, tenta via API route como último recurso

## Como Funciona

### Fluxo de Inicialização

```
1. DataService.ensureTiposServicoInitialized() é chamado
   ↓
2. Verifica se já existem tipos para o usuário
   ↓
3. Se não existem:
   a. Detecta se está usando Supabase + Cliente (navegador)
   b. Se sim: Chama API route /api/init/tipos-servico
   c. Se não: Usa método direto (Firebase ou servidor Supabase)
   ↓
4. API route (no servidor):
   a. Autentica o usuário via NextAuth
   b. Usa cliente admin do Supabase (bypass RLS)
   c. Cria os dados padrão
   ↓
5. Sucesso!
```

### Segurança

✅ **Cliente admin apenas no servidor**: A service role key nunca é exposta no cliente
✅ **Autenticação obrigatória**: API routes verificam autenticação via NextAuth
✅ **Isolamento por usuário**: Dados criados com `user_id` correto
✅ **Fallback seguro**: Se API route falhar, tenta método direto com tratamento de erro

## Políticas RLS Necessárias

As políticas RLS no Supabase devem permitir:

### Para SELECT (Leitura)
```sql
-- Usuários podem ler seus próprios dados
CREATE POLICY "Users can view own tipos_servicos" ON tipo_servicos
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own tipo_eventos" ON tipo_eventos
    FOR SELECT USING (auth.uid()::text = user_id::text);
```

### Para INSERT (Criação)
```sql
-- Usuários podem criar seus próprios dados
CREATE POLICY "Users can insert own tipos_servicos" ON tipo_servicos
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own tipo_eventos" ON tipo_eventos
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
```

### Para UPDATE (Atualização)
```sql
-- Usuários podem atualizar seus próprios dados
CREATE POLICY "Users can update own tipos_servicos" ON tipo_servicos
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own tipo_eventos" ON tipo_eventos
    FOR UPDATE USING (auth.uid()::text = user_id::text);
```

## ⚠️ IMPORTANTE: Problema com Autenticação Supabase

**O sistema atual usa NextAuth com Firebase Auth**, não Supabase Auth. Isso significa que:

1. `auth.uid()` no Supabase não retornará o ID do usuário autenticado
2. As políticas RLS baseadas em `auth.uid()` não funcionarão corretamente
3. **Solução temporária**: As API routes usam o cliente admin para contornar RLS

### Soluções Possíveis (Futuras)

#### Opção 1: Sincronizar Sessão Supabase
Quando o usuário faz login via NextAuth, criar uma sessão no Supabase Auth também.

#### Opção 2: Políticas RLS Baseadas em user_id
Modificar as políticas para verificar `user_id` diretamente, não `auth.uid()`. Isso requer:
- JWT customizado do NextAuth
- Ou políticas RLS mais complexas que leiam do token

#### Opção 3: Service Role Key para Operações Iniciais
Continuar usando service role key para inicialização (como está agora), mas permitir que o usuário crie novos registros depois.

### Recomendação Atual

**Manter a solução atual (API routes com admin)** porque:
- ✅ Funciona imediatamente
- ✅ Segura (admin apenas no servidor)
- ✅ Não requer mudanças nas políticas RLS existentes
- ✅ Compatível com autenticação NextAuth/Firebase

## Testes

Para testar a solução:

1. **Limpar dados existentes** (opcional):
   ```sql
   DELETE FROM tipo_servicos WHERE user_id = 'SEU_USER_ID';
   DELETE FROM tipo_eventos WHERE user_id = 'SEU_USER_ID';
   ```

2. **Recarregar a página** que chama `getTiposServicoAtivos()` ou `getTiposEvento()`

3. **Verificar logs**:
   - Console do navegador: deve mostrar inicialização via API route
   - Logs do servidor: devem mostrar criação via cliente admin

4. **Verificar dados**:
   ```sql
   SELECT * FROM tipo_servicos WHERE user_id = 'SEU_USER_ID';
   SELECT * FROM tipo_eventos WHERE user_id = 'SEU_USER_ID';
   ```

## Próximos Passos

1. ✅ **Criar API routes** - Concluído
2. ✅ **Modificar DataService** - Concluído
3. ⏳ **Configurar políticas RLS adequadas** no Supabase Dashboard
4. ⏳ **Testar em produção**
5. ⏳ **Considerar migração para Supabase Auth** (futuro)

## Arquivos Modificados

- `src/lib/data-service.ts` - Modificado para usar API routes quando necessário
- `src/app/api/init/tipos-servico/route.ts` - Novo arquivo
- `src/app/api/init/tipos-evento/route.ts` - Novo arquivo

## Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Service Role Key](https://supabase.com/docs/guides/auth/service-role-key)
- Schema SQL: `supabase/schema.sql` (linhas 424-446)













