# Plano de Implementação: Pré-Cadastro de Eventos

## Data: 2025-01-XX

## Visão Geral

Implementação completa do sistema de pré-cadastro de eventos, permitindo que o dono da conta gere um link público para seus clientes preencherem informações do evento. O sistema terá validação de expiração (7 dias), múltiplos status, e integração completa com o sistema de eventos existente.

---

## FASE 1: Estrutura de Banco de Dados

### 1.1 Criar Tabela `pre_cadastros_eventos`

**Arquivo**: `supabase/schema.sql`

```sql
-- Pré-Cadastros de Eventos
CREATE TABLE IF NOT EXISTS pre_cadastros_eventos (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados do Cliente (preenchidos pelo cliente)
    cliente_nome VARCHAR(255),
    cliente_email VARCHAR(255),
    cliente_telefone VARCHAR(50),
    cliente_cpf VARCHAR(20),
    cliente_endereco TEXT,
    cliente_cep VARCHAR(10),
    cliente_instagram VARCHAR(255),
    cliente_canal_entrada_id VARCHAR(255) REFERENCES canais_entrada(id) ON DELETE SET NULL,
    
    -- Dados do Evento (preenchidos pelo cliente)
    nome_evento VARCHAR(255),
    data_evento TIMESTAMP WITH TIME ZONE,
    local VARCHAR(255),
    endereco TEXT,
    tipo_evento VARCHAR(255),
    tipo_evento_id VARCHAR(255) REFERENCES tipo_eventos(id) ON DELETE SET NULL,
    contratante VARCHAR(255),
    numero_convidados INTEGER DEFAULT 0,
    quantidade_mesas INTEGER,
    hashtag VARCHAR(255),
    horario_inicio VARCHAR(50),
    horario_termino VARCHAR(50), -- Horário de Desmontagem
    cerimonialista JSONB, -- { nome, telefone }
    observacoes TEXT,
    
    -- Metadados
    status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'preenchido', 'convertido', 'expirado', 'ignorado')),
    data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL, -- 7 dias após criação
    data_preenchimento TIMESTAMP WITH TIME ZONE,
    data_conversao TIMESTAMP WITH TIME ZONE, -- Quando foi convertido em evento
    evento_id VARCHAR(255) REFERENCES eventos(id) ON DELETE SET NULL, -- ID do evento criado a partir deste pré-cadastro
    cliente_id VARCHAR(255) REFERENCES clientes(id) ON DELETE SET NULL, -- ID do cliente criado/utilizado
    
    -- Timestamps
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pre_cadastros_user_id ON pre_cadastros_eventos(user_id);
CREATE INDEX idx_pre_cadastros_status ON pre_cadastros_eventos(user_id, status);
CREATE INDEX idx_pre_cadastros_data_expiracao ON pre_cadastros_eventos(data_expiracao) WHERE status NOT IN ('expirado', 'convertido');
CREATE INDEX idx_pre_cadastros_cliente_email ON pre_cadastros_eventos(user_id, cliente_email);
```

### 1.2 Criar Tabela `pre_cadastros_servicos`

**Arquivo**: `supabase/schema.sql`

```sql
-- Serviços dos Pré-Cadastros
CREATE TABLE IF NOT EXISTS pre_cadastros_servicos (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pre_cadastro_id VARCHAR(255) NOT NULL REFERENCES pre_cadastros_eventos(id) ON DELETE CASCADE,
    tipo_servico_id VARCHAR(255) NOT NULL REFERENCES tipo_servicos(id) ON DELETE RESTRICT,
    observacoes TEXT,
    removido BOOLEAN NOT NULL DEFAULT false,
    data_remocao TIMESTAMP WITH TIME ZONE,
    motivo_remocao TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pre_cadastros_servicos_user_id ON pre_cadastros_servicos(user_id);
CREATE INDEX idx_pre_cadastros_servicos_pre_cadastro_id ON pre_cadastros_servicos(pre_cadastro_id);
CREATE INDEX idx_pre_cadastros_servicos_removido ON pre_cadastros_servicos(pre_cadastro_id, removido) WHERE removido = false;
```

---

## FASE 2: Tipos TypeScript

### 2.1 Criar Interface `PreCadastroEvento`

**Arquivo**: `src/types/index.ts`

```typescript
export enum StatusPreCadastro {
  PENDENTE = 'pendente',
  PREENCHIDO = 'preenchido',
  CONVERTIDO = 'convertido',
  EXPIRADO = 'expirado',
  IGNORADO = 'ignorado'
}

export interface PreCadastroEvento {
  id: string;
  userId: string;
  
  // Dados do Cliente
  clienteNome?: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  clienteCpf?: string;
  clienteEndereco?: string;
  clienteCep?: string;
  clienteInstagram?: string;
  clienteCanalEntradaId?: string;
  clienteCanalEntrada?: CanalEntrada;
  
  // Dados do Evento
  nomeEvento?: string;
  dataEvento?: Date;
  local?: string;
  endereco?: string;
  tipoEvento?: string;
  tipoEventoId?: string;
  tipoEventoObj?: TipoEvento;
  contratante?: string;
  numeroConvidados?: number;
  quantidadeMesas?: number;
  hashtag?: string;
  horarioInicio?: string;
  horarioTermino?: string; // Horário de Desmontagem
  cerimonialista?: {
    nome?: string;
    telefone?: string;
  };
  observacoes?: string;
  
  // Metadados
  status: StatusPreCadastro;
  dataExpiracao: Date;
  dataPreenchimento?: Date;
  dataConversao?: Date;
  eventoId?: string;
  clienteId?: string;
  
  // Relacionamentos
  servicos?: PreCadastroServico[];
  
  // Timestamps
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export interface PreCadastroServico {
  id: string;
  userId: string;
  preCadastroId: string;
  tipoServicoId: string;
  tipoServico?: TipoServico;
  observacoes?: string;
  removido?: boolean;
  dataRemocao?: Date;
  motivoRemocao?: string;
  dataCadastro: Date;
}
```

---

## FASE 3: Repositórios

### 3.1 Criar `PreCadastroEventoSupabaseRepository`

**Arquivo**: `src/lib/repositories/supabase/pre-cadastro-evento-supabase-repository.ts`

**Responsabilidades**:
- CRUD completo de pré-cadastros
- Buscar por ID (público, validando expiração)
- Buscar por userId com filtros de status
- Contar pré-cadastros por status
- Validar expiração e atualizar status automaticamente

### 3.2 Criar `PreCadastroServicoSupabaseRepository`

**Arquivo**: `src/lib/repositories/supabase/pre-cadastro-servico-supabase-repository.ts`

**Responsabilidades**:
- CRUD de serviços do pré-cadastro
- Buscar serviços por `preCadastroId`
- Criar múltiplos serviços de uma vez
- Deletar todos os serviços de um pré-cadastro (ao converter em evento)

### 3.3 Atualizar `RepositoryFactory`

**Arquivo**: `src/lib/repositories/repository-factory.ts`

Adicionar:
- `getPreCadastroEventoRepository()`
- `getPreCadastroServicoRepository()`

---

## FASE 4: Services

### 4.1 Criar `PreCadastroEventoService`

**Arquivo**: `src/lib/services/pre-cadastro-evento-service.ts`

**Métodos principais**:
- `gerarLinkPreCadastro(userId: string): Promise<{ id: string; link: string }>` - Gera link e cria registro pendente
- `validarExpiracao(preCadastroId: string): Promise<boolean>` - Valida e atualiza status se expirado
- `salvarPreCadastro(preCadastroId: string, dados: Partial<PreCadastroEvento>): Promise<PreCadastroEvento>` - Salva dados preenchidos pelo cliente
- `converterEmEvento(preCadastroId: string, userId: string): Promise<Evento>` - Converte pré-cadastro em evento (com verificação de cliente)
- `marcarComoIgnorado(preCadastroId: string, userId: string): Promise<void>`
- `renovarExpiracao(preCadastroId: string, userId: string): Promise<void>` - Adiciona mais 7 dias
- `contarPorStatus(userId: string): Promise<Record<StatusPreCadastro, number>>`

**Lógica de conversão em evento**:
1. Buscar pré-cadastro por ID
2. Validar que pertence ao userId
3. Verificar se email do cliente já existe no sistema
4. Se existir: usar cliente existente
5. Se não existir: criar novo cliente
6. Criar evento com dados do pré-cadastro
7. Copiar serviços do pré-cadastro para o evento
8. Atualizar pré-cadastro: status = 'convertido', eventoId = novo evento.id, clienteId = cliente.id
9. Retornar evento criado

---

## FASE 5: API Routes

### 5.1 POST `/api/pre-cadastros/gerar-link`

**Autenticação**: Sim (autenticado)

**Body**: Nenhum (userId vem da sessão)

**Resposta**:
```json
{
  "data": {
    "id": "abc123xyz",
    "link": "https://seusite.com/pre-cadastro/abc123xyz"
  }
}
```

**Ação**: Cria registro pendente com expiração em 7 dias

### 5.2 GET `/api/pre-cadastros/[id]`

**Autenticação**: Não (público, mas valida expiração)

**Query Params**: Nenhum

**Resposta**:
- Se válido: `{ data: PreCadastroEvento }`
- Se expirado: `{ error: "Link expirado" }` (status 410)
- Se não encontrado: `{ error: "Pré-cadastro não encontrado" }` (status 404)

**Ação**: Busca pré-cadastro e valida expiração

### 5.3 POST `/api/pre-cadastros/[id]`

**Autenticação**: Não (público, mas valida expiração)

**Body**: Dados do formulário (cliente + evento)

**Validações**:
- Verificar se expirado
- Verificar se status é 'pendente'
- Validar campos obrigatórios

**Resposta**:
```json
{
  "data": {
    "success": true,
    "message": "Pré-cadastro realizado com sucesso!"
  }
}
```

**Ação**: Salva dados e atualiza status para 'preenchido'

### 5.4 GET `/api/pre-cadastros`

**Autenticação**: Sim (autenticado)

**Query Params**: 
- `status` (opcional): filtrar por status
- `page` (opcional): paginação
- `limit` (opcional): limite de resultados

**Resposta**:
```json
{
  "data": {
    "preCadastros": PreCadastroEvento[],
    "total": number,
    "contadores": {
      "pendente": number,
      "preenchido": number,
      "convertido": number,
      "expirado": number,
      "ignorado": number
    }
  }
}
```

**Ação**: Lista pré-cadastros do usuário com contadores

### 5.5 POST `/api/pre-cadastros/[id]/criar-evento`

**Autenticação**: Sim (autenticado)

**Body**: Nenhum

**Validações**:
- Verificar se pertence ao userId
- Verificar se status é 'preenchido'
- Verificar limite de eventos do plano

**Resposta**:
```json
{
  "data": {
    "evento": Evento,
    "clienteUtilizado": Cliente, // Cliente existente ou criado
    "clienteNovo": boolean // true se criou novo cliente
  }
}
```

**Ação**: Converte pré-cadastro em evento

### 5.6 PATCH `/api/pre-cadastros/[id]/ignorar`

**Autenticação**: Sim (autenticado)

**Body**: Nenhum

**Ação**: Atualiza status para 'ignorado'

### 5.7 PATCH `/api/pre-cadastros/[id]/renovar`

**Autenticação**: Sim (autenticado)

**Body**: Nenhum

**Ação**: Adiciona mais 7 dias à data de expiração (se ainda não estiver expirado)

### 5.8 GET `/api/pre-cadastros/[id]/copiar-link`

**Autenticação**: Sim (autenticado)

**Resposta**: `{ data: { link: string } }`

**Ação**: Retorna link completo para cópia

### 5.9 DELETE `/api/pre-cadastros/[id]`

**Autenticação**: Sim (autenticado)

**Validações**:
- Verificar se pertence ao userId
- Não permitir deletar se já convertido em evento (ou deletar também o evento?)

**Ação**: Deleta pré-cadastro e seus serviços

---

## FASE 6: Componentes React

### 6.1 Criar `PreCadastroForm` (Público)

**Arquivo**: `src/components/forms/PreCadastroForm.tsx`

**Baseado em**: `EventoForm.tsx` (versão simplificada)

**Características**:
- Sem autenticação
- Sem campos de custos/pagamentos/anexos
- Sem possibilidade de criar novos tipos de evento/canal de entrada/serviços
- Validação de campos obrigatórios
- Exibir mensagem de sucesso ao enviar
- Exibir mensagem de erro se link expirado

**Campos**:
- Dados do Cliente (sempre como novo cliente)
- Dados do Evento
- Horários
- Cerimonialista
- Serviços do Evento (apenas selecionar, sem criar novos)

### 6.2 Criar `PreCadastroCard`

**Arquivo**: `src/components/cards/PreCadastroCard.tsx`

**Exibir**:
- Nome do cliente / Email
- Data do evento
- Local
- Status (badge colorido)
- Data de criação
- Botões: Visualizar, Criar Evento, Ignorar, Renovar, Deletar, Copiar Link

### 6.3 Criar `PreCadastroDetailModal`

**Arquivo**: `src/components/modals/PreCadastroDetailModal.tsx`

**Exibir**:
- Todos os dados do pré-cadastro em formato organizado
- Serviços selecionados
- Informações do cliente
- Ações disponíveis

### 6.4 Criar `PreCadastroBadge`

**Arquivo**: `src/components/badges/PreCadastroBadge.tsx`

**Exibir**:
- Contador de pré-cadastros pendentes/preenchidos
- Badge vermelho se houver pendentes/preenchidos
- Click para ir para aba de pré-cadastros

---

## FASE 7: Páginas

### 7.1 Criar Página Pública `/pre-cadastro/[id]`

**Arquivo**: `src/app/pre-cadastro/[id]/page.tsx`

**Características**:
- Página pública (sem Layout autenticado)
- Layout simples com logo/header
- Carregar pré-cadastro por ID via API
- Validar expiração antes de exibir formulário
- Se expirado: exibir mensagem de expiração
- Se válido: exibir `PreCadastroForm`
- Ao enviar: exibir mensagem de sucesso e desabilitar formulário

### 7.2 Atualizar Página de Eventos

**Arquivo**: `src/app/eventos/page.tsx`

**Adicionar**:
- Aba "Pré-Cadastros" ao lado de "Ativos" e "Arquivados"
- Botão "Gerar Link de Pré-Cadastro" (com modal de confirmação e cópia do link)
- Badge de contagem no cabeçalho
- Lista de pré-cadastros em cards (similar aos eventos)
- Filtros por status
- Integração com `PreCadastroDetailModal`
- Integração com ações (criar evento, ignorar, renovar, deletar, copiar link)

---

## FASE 8: Integração e Fluxos

### 8.1 Fluxo: Gerar Link

1. Usuário clica em "Gerar Link de Pré-Cadastro"
2. Chamada API: `POST /api/pre-cadastros/gerar-link`
3. API cria registro pendente com:
   - `id` gerado (UUID)
   - `status = 'pendente'`
   - `dataExpiracao = NOW() + 7 dias`
   - `userId = sessão atual`
4. Retorna link completo: `/pre-cadastro/{id}`
5. Modal exibe link com botão "Copiar Link"
6. Link é copiado automaticamente para área de transferência
7. Modal exibe mensagem de sucesso

### 8.2 Fluxo: Cliente Preenche Formulário

1. Cliente acessa `/pre-cadastro/{id}`
2. Página carrega pré-cadastro via `GET /api/pre-cadastros/{id}`
3. API valida:
   - Pré-cadastro existe
   - Não está expirado (se expirado, retorna erro)
4. Se válido: exibe formulário pré-preenchido (vazio)
5. Cliente preenche dados
6. Cliente submete formulário
7. Chamada API: `POST /api/pre-cadastros/{id}`
8. API valida:
   - Não expirado
   - Status é 'pendente'
   - Campos obrigatórios preenchidos
9. API salva dados e serviços
10. API atualiza status para 'preenchido'
11. API atualiza `dataPreenchimento`
12. Retorna sucesso
13. Página exibe mensagem de sucesso
14. Formulário é desabilitado

### 8.3 Fluxo: Converter em Evento

1. Usuário visualiza pré-cadastro na lista
2. Usuário clica em "Criar Evento"
3. Modal de confirmação (opcional)
4. Chamada API: `POST /api/pre-cadastros/{id}/criar-evento`
5. Service `converterEmEvento`:
   - Busca pré-cadastro
   - Verifica se email do cliente existe
   - Se existe: busca cliente existente
   - Se não existe: cria novo cliente
   - Cria evento com dados do pré-cadastro
   - Copia serviços do pré-cadastro para o evento
   - Atualiza pré-cadastro: status = 'convertido', eventoId, clienteId
6. Redireciona para `/eventos/{eventoId}`
7. Toast de sucesso: "Evento criado com sucesso a partir do pré-cadastro"

### 8.4 Fluxo: Visualizar Detalhes

1. Usuário clica em "Visualizar" no card
2. Abre `PreCadastroDetailModal`
3. Modal carrega todos os dados do pré-cadastro
4. Exibe informações organizadas
5. Botões de ação disponíveis no modal

### 8.5 Fluxo: Atualização de Status Automático

**Job/Cron opcional** (ou verificação on-demand):

- Ao buscar lista de pré-cadastros, verificar expiração
- Se `dataExpiracao < NOW()` e `status IN ('pendente', 'preenchido')`:
  - Atualizar status para 'expirado'

**Alternativa**: Verificar na hora da busca individual via API

---

## FASE 9: Melhorias e Segurança

### 9.1 Segurança

- Validação de UUID no link (prevenir enumeração)
- Rate limiting nas APIs públicas (prevenir spam)
- Validação rigorosa de campos obrigatórios
- Sanitização de inputs
- Verificação de propriedade nas APIs autenticadas

### 9.2 UX/UI

- Loading states em todas as ações
- Mensagens de erro claras
- Confirmações para ações destrutivas
- Tooltips informativos
- Indicadores visuais de status

### 9.3 Performance

- Paginação na lista de pré-cadastros
- Lazy loading de serviços
- Cache de contadores (se necessário)
- Índices adequados no banco

---

## Ordem de Implementação Sugerida

1. ✅ FASE 1: Estrutura de Banco de Dados
2. ✅ FASE 2: Tipos TypeScript
3. ✅ FASE 3: Repositórios
4. ✅ FASE 4: Services
5. ✅ FASE 5: API Routes (começar com as essenciais)
6. ✅ FASE 6: Componentes React
7. ✅ FASE 7: Páginas
8. ✅ FASE 8: Integração e Fluxos
9. ✅ FASE 9: Melhorias e Segurança

---

## Notas Importantes

1. **Campos Opcionais vs Obrigatórios**: O formulário público deve validar apenas os campos obrigatórios. Campos opcionais podem ser preenchidos pelo usuário depois ao criar o evento.

2. **Serviços**: Os serviços são salvos na tabela `pre_cadastros_servicos`. Ao converter em evento, são copiados para `servicos_evento` e depois deletados do pré-cadastro (ou mantidos para histórico - decidir).

3. **Cliente Duplicado**: A verificação de cliente existente deve ser feita por email (normalizado: lowercase, trim). Se existir, usar cliente existente. O usuário pode depois atualizar informações do cliente se necessário.

4. **Status Expirado**: Status pode ser atualizado automaticamente via job/cron ou verificação on-demand. A verificação on-demand é mais simples e suficiente.

5. **Histórico**: Manter pré-cadastros mesmo depois de convertidos permite histórico e auditoria. Status 'convertido' indica que já foi usado.

---

## Próximos Passos

Após aprovação deste plano, iniciar implementação pela FASE 1 (Estrutura de Banco de Dados) e seguir sequencialmente.
