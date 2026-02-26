# Step-by-Step: Solução para Problemas de RLS na Inicialização

## Data: 2025-01-XX

## Problema Identificado

O sistema apresentava erros ao tentar criar dados padrão (tipos de serviço e tipos de evento) quando usando Supabase com Row Level Security (RLS) habilitado.

**Erros observados:**
- `401 (Unauthorized)` ao acessar `/rest/v1/tipo_servicos`
- `new row violates row-level security policy for table "tipo_servicos"`
- `new row violates row-level security policy for table "tipo_eventos"`

## Causa Raiz

1. RLS habilitado nas tabelas do Supabase
2. Tentativa de criar dados do navegador usando chave anon (pública)
3. Usuário autenticado via NextAuth/Firebase, mas sem sessão Supabase
4. Políticas RLS bloqueando operações sem autenticação Supabase adequada

## Solução Implementada

### 1. Criação de API Routes no Servidor

#### Arquivo: `src/app/api/init/tipos-servico/route.ts`
**Função**: Inicializar tipos de serviço padrão usando cliente admin do Supabase

**Características**:
- Verifica autenticação via NextAuth
- Usa cliente admin (service role key) para contornar RLS
- Compatível com Firebase e Supabase
- Cria 3 tipos padrão: "totem fotográfico", "instaprint", "outros"

#### Arquivo: `src/app/api/init/tipos-evento/route.ts`
**Função**: Inicializar tipos de evento padrão usando cliente admin do Supabase

**Características**:
- Verifica autenticação via NextAuth
- Usa cliente admin (service role key) para contornar RLS
- Compatível com Firebase e Supabase
- Usa constantes `DEFAULT_TIPOS_EVENTO` do sistema

### 2. Modificação do DataService

#### Arquivo: `src/lib/data-service.ts`

**Método modificado**: `ensureTiposServicoInitialized()`

**Alterações**:
1. Detecta se está usando Supabase + cliente (navegador)
2. Chama API route `/api/init/tipos-servico` automaticamente quando detectado
3. Fallback para método direto se API route falhar
4. Tratamento especial para erros de RLS

**Método modificado**: `ensureTiposEventoInitialized()`

**Alterações**:
1. Detecta se está usando Supabase + cliente (navegador)
2. Chama API route `/api/init/tipos-evento` automaticamente quando detectado
3. Fallback para método direto se API route falhar
4. Tratamento especial para erros de RLS

## Fluxo de Execução

```
┌─────────────────────────────────────────────────────┐
│ EventoForm.tsx chama getTiposServicoAtivos()       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ DataService.getTiposServicoAtivos()                 │
│ └─> ensureTiposServicoInitialized(userId)          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Verifica: existe tipos para este usuário?          │
└─────┬───────────────────────────────────┬───────────┘
      │ SIM                               │ NÃO
      ▼                                   ▼
   Retorna                            ┌─────────────────┐
                                      │ Detecta:        │
                                      │ - Supabase?     │
                                      │ - Cliente?      │
                                      └─────┬───────────┘
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      │                                           │
                      ▼ SIM                                       ▼ NÃO
        ┌─────────────────────────────┐          ┌─────────────────────────────┐
        │ Chama API Route             │          │ Usa método direto           │
        │ POST /api/init/tipos-servico│          │ (Firebase ou Servidor)      │
        └─────────────┬───────────────┘          └─────────────┬───────────────┘
                      │                                         │
                      ▼                                         ▼
        ┌─────────────────────────────┐          ┌─────────────────────────────┐
        │ API Route (Servidor):       │          │ Repository.createTipoServico│
        │ - Verifica NextAuth         │          │                             │
        │ - Usa cliente admin         │          │                             │
        │ - Cria dados via admin      │          │                             │
        └─────────────┬───────────────┘          └─────────────┬───────────────┘
                      │                                         │
                      └─────────────────┬───────────────────────┘
                                        │
                                        ▼
                           ┌────────────────────────┐
                           │ Sucesso! Dados criados │
                           └────────────────────────┘
```

## Segurança

### Pontos de Segurança Implementados

1. ✅ **Service Role Key apenas no servidor**
   - Nunca exposta no cliente
   - Apenas nas API routes (servidor)

2. ✅ **Autenticação obrigatória**
   - API routes verificam sessão NextAuth
   - Retorna 401 se não autenticado

3. ✅ **Isolamento por usuário**
   - Todos os dados criados com `user_id` correto
   - Usuários não podem criar dados para outros usuários

4. ✅ **Fallback seguro**
   - Se API route falhar, tenta método direto
   - Erros são logados, mas não quebram a aplicação

## Configuração Necessária

### Variáveis de Ambiente

Certifique-se de ter configurado:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key  # ⚠️ SECRETA, apenas servidor
```

### Políticas RLS no Supabase

As políticas RLS devem permitir leitura e escrita baseadas em `user_id`. 

**Nota**: Como o sistema usa NextAuth (não Supabase Auth), as políticas baseadas em `auth.uid()` não funcionarão. A solução atual usa cliente admin para inicialização.

## Testes Realizados

1. ✅ Criação de tipos de serviço via API route
2. ✅ Criação de tipos de evento via API route
3. ✅ Fallback para método direto (Firebase)
4. ✅ Tratamento de erros de RLS

## Arquivos Criados/Modificados

### Novos Arquivos

1. `src/app/api/init/tipos-servico/route.ts`
   - **Função**: API route para inicializar tipos de serviço
   - **Linhas**: ~120
   - **Dependências**: NextAuth, Supabase Client, Repository Factory

2. `src/app/api/init/tipos-evento/route.ts`
   - **Função**: API route para inicializar tipos de evento
   - **Linhas**: ~120
   - **Dependências**: NextAuth, Supabase Client, Repository Factory

3. `supabase/SOLUCAO_RLS_INICIALIZACAO.md`
   - **Função**: Documentação da solução
   - **Conteúdo**: Explicação detalhada do problema e solução

4. `step-by-step/solucao-rls-inicializacao.md` (este arquivo)
   - **Função**: Documentação passo-a-passo
   - **Conteúdo**: Descrição detalhada das alterações

### Arquivos Modificados

1. `src/lib/data-service.ts`
   - **Métodos modificados**: 
     - `ensureTiposServicoInitialized()` (linhas ~106-126)
     - `ensureTiposEventoInitialized()` (linhas ~56-79)
   - **Alterações**: Adicionada lógica para chamar API routes quando necessário

## Próximos Passos Recomendados

1. ⏳ **Configurar políticas RLS adequadas** no Supabase Dashboard
   - Permitir leitura baseada em `user_id`
   - Permitir escrita baseada em `user_id` (ou usar admin para criação inicial)

2. ⏳ **Testar em ambiente de produção**
   - Verificar se a inicialização funciona corretamente
   - Monitorar logs para erros

3. ⏳ **Considerar migração para Supabase Auth** (futuro)
   - Unificar autenticação em Supabase
   - Simplificar políticas RLS
   - Melhorar segurança geral

4. ⏳ **Adicionar testes automatizados**
   - Testes unitários para API routes
   - Testes de integração para fluxo completo

## Observações Importantes

1. **Autenticação Híbrida**: O sistema atual usa NextAuth com Firebase, mas armazena dados no Supabase. Isso cria uma camada de complexidade que a solução atual contorna usando cliente admin.

2. **Performance**: A chamada da API route adiciona uma requisição HTTP adicional, mas é necessária para contornar o RLS. O impacto é mínimo pois a inicialização acontece apenas uma vez por usuário.

3. **Manutenibilidade**: A solução mantém compatibilidade com Firebase e Supabase, permitindo migração gradual.

## Resultado

✅ Problema resolvido: Dados padrão são criados automaticamente via API routes no servidor, contornando políticas RLS de forma segura.

✅ Solução escalável: Funciona tanto para Supabase quanto Firebase.

✅ Segurança mantida: Service role key apenas no servidor, autenticação obrigatória, isolamento por usuário.













