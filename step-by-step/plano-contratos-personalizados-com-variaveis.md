# Plano: Sistema de Contratos Personalizados com Variáveis Customizáveis

**Data**: 2025-01-XX  
**Status**: 📋 **PLANO** (não executado)

---

## 📋 OBJETIVO

Permitir que cada cliente:
1. **Defina variáveis customizáveis** que se repetirão em todos os contratos
2. **Crie templates personalizados** usando editor de texto
3. **Use variáveis do evento** automaticamente no template
4. **Salve templates** para reutilização futura
5. **Gere contratos dinamicamente** em um clique

---

## 🎯 REQUISITOS FUNCIONAIS

### **1. Variáveis Customizáveis por Cliente**
- Cliente pode criar variáveis próprias (ex: `{{nome_empresa}}`, `{{telefone_comercial}}`)
- Variáveis podem ser de dois tipos:
  - **Únicas**: `{{variavel}}` → retorna string simples (ex: "Pedro Miguel")
  - **Múltiplas**: `[variavel]` → retorna array como string separada por vírgula (ex: "clickse 360, totem fotográfico, instaclick")

### **2. Editor de Template**
- Editor WYSIWYG ou texto rico para montar o contrato
- Autocomplete de variáveis disponíveis
- Preview em tempo real
- Suporte a HTML/CSS inline para formatação

### **3. Fontes de Variáveis**
- **Configuração do Cliente** (dados base que se repetem):
  - Dados da empresa (já existe em `configuracao_contrato`)
  - Variáveis customizadas criadas pelo cliente
- **Dados do Evento** (variáveis dinâmicas):
  - Todos os campos do `Evento` (nome, data, local, etc.)
  - Serviços do evento (tipos de serviço)
  - Dados do cliente do evento

### **4. Sistema de Templates**
- Cliente pode salvar templates personalizados
- Templates ficam associados ao `userId` (privados do cliente)
- Pode criar múltiplos templates
- Pode editar/deletar seus próprios templates

### **5. Geração Dinâmica**
- Ao criar contrato a partir de evento: seleciona template → gera automaticamente
- Ao criar contrato manual: preenche variáveis → gera

---

## 🏗️ ARQUITETURA

### **Estrutura de Dados**

#### **1. Nova Tabela: `variaveis_contrato`**
```sql
CREATE TABLE variaveis_contrato (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chave VARCHAR(100) NOT NULL, -- Ex: "nome_empresa", "telefone_comercial"
    label VARCHAR(255) NOT NULL, -- Ex: "Nome da Empresa", "Telefone Comercial"
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('unica', 'multipla')), -- 'unica' = {{}}, 'multipla' = []
    valor_padrao TEXT, -- Valor padrão (opcional)
    descricao TEXT, -- Descrição da variável
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, chave) -- Não pode ter duas variáveis com mesma chave por usuário
);

CREATE INDEX idx_variaveis_contrato_user_id ON variaveis_contrato(user_id);
CREATE INDEX idx_variaveis_contrato_user_ativo ON variaveis_contrato(user_id, ativo) WHERE ativo = true;
```

#### **2. Atualizar Tabela: `modelos_contrato`**
```sql
-- Adicionar campo user_id para templates personalizados
ALTER TABLE modelos_contrato 
ADD COLUMN user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_modelos_contrato_user_id ON modelos_contrato(user_id);
CREATE INDEX idx_modelos_contrato_user_ativo ON modelos_contrato(user_id, ativo) WHERE ativo = true;
```

**Comportamento:**
- `user_id = NULL` → Modelo global (padrão do sistema)
- `user_id = <userId>` → Template personalizado do cliente

#### **3. Atualizar Interface `ModeloContrato`**
```typescript
export interface ModeloContrato {
  id: string;
  nome: string;
  descricao?: string;
  template: string;
  campos: CampoContrato[]; // Manter para compatibilidade
  ativo: boolean;
  userId?: string; // NULL = global, preenchido = privado
  dataCadastro: Date;
  dataAtualizacao: Date;
}
```

#### **4. Nova Interface: `VariavelContrato`**
```typescript
export interface VariavelContrato {
  id: string;
  userId: string;
  chave: string; // Ex: "nome_empresa"
  label: string; // Ex: "Nome da Empresa"
  tipo: 'unica' | 'multipla'; // 'unica' = {{variavel}}, 'multipla' = [variavel]
  valorPadrao?: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
  dataCadastro: Date;
  dataAtualizacao: Date;
}
```

---

## 🔧 BACKEND

### **1. Repositórios**

#### **`VariavelContratoRepository`** (novo)
**Arquivo**: `src/lib/repositories/supabase/variavel-contrato-supabase-repository.ts`

**Métodos:**
- `findByUserId(userId: string): Promise<VariavelContrato[]>` - Buscar todas as variáveis do usuário
- `findAtivasByUserId(userId: string): Promise<VariavelContrato[]>` - Buscar apenas variáveis ativas
- `findById(id: string): Promise<VariavelContrato | null>`
- `create(variavel: Omit<VariavelContrato, 'id'>): Promise<VariavelContrato>`
- `update(id: string, variavel: Partial<VariavelContrato>): Promise<VariavelContrato>`
- `delete(id: string): Promise<void>`
- `findByChave(userId: string, chave: string): Promise<VariavelContrato | null>` - Buscar por chave única

#### **Atualizar `ModeloContratoRepository`**
- `findByUserId(userId: string): Promise<ModeloContrato[]>` - Buscar templates do usuário
- `findAtivos(userId?: string): Promise<ModeloContrato[]>` - Se userId fornecido, retorna globais + do usuário
- `create()` - Suportar `userId` opcional

### **2. Serviços**

#### **`VariavelContratoService`** (novo)
**Arquivo**: `src/lib/services/variavel-contrato-service.ts`

**Métodos:**
- `static validarChave(chave: string): { valido: boolean; erro?: string }` - Validar formato da chave (sem espaços, caracteres especiais)
- `static obterTodasVariaveisDisponiveis(userId: string): Promise<Record<string, any>>` - Retorna objeto com todas as variáveis (configuração + customizadas + evento)
- `static formatarVariavelMultipla(valores: string[]): string` - Formata array como "item1, item2, item3"

#### **Atualizar `ContratoService`**
- `static async obterVariaveisParaTemplate(userId: string, eventoId?: string): Promise<Record<string, any>>`
  - Busca: configuração do cliente + variáveis customizadas + dados do evento (se fornecido)
  - Retorna objeto unificado com todas as variáveis disponíveis

#### **Atualizar `TemplateService`**
- `static processarPlaceholders(template: string, dados: Record<string, any>): string`
  - **Atualizar** para suportar dois tipos de placeholders:
    - `{{variavel}}` → substitui por string simples
    - `[variavel]` → substitui por array formatado como string (ex: "item1, item2")
- `static extrairPlaceholders(template: string): { unicas: string[], multiplas: string[] }` - Extrair ambos os tipos
- `static validarPlaceholders(template: string, variaveisDisponiveis: string[]): { valido: boolean; erros: string[] }`

### **3. APIs**

#### **`/api/variaveis-contrato`** (novo)
**Arquivo**: `src/app/api/variaveis-contrato/route.ts`

- **GET**: Lista variáveis do usuário autenticado
  ```typescript
  GET /api/variaveis-contrato
  Response: VariavelContrato[]
  ```

- **POST**: Cria nova variável
  ```typescript
  POST /api/variaveis-contrato
  Body: {
    chave: string,
    label: string,
    tipo: 'unica' | 'multipla',
    valorPadrao?: string,
    descricao?: string,
    ordem?: number
  }
  ```

#### **`/api/variaveis-contrato/[id]`** (novo)
**Arquivo**: `src/app/api/variaveis-contrato/[id]/route.ts`

- **GET**: Busca variável por ID
- **PUT**: Atualiza variável
- **DELETE**: Deleta variável

#### **`/api/variaveis-contrato/disponiveis`** (novo)
**Arquivo**: `src/app/api/variaveis-contrato/disponiveis/route.ts`

- **GET**: Retorna todas as variáveis disponíveis para o usuário (configuração + customizadas)
  ```typescript
  GET /api/variaveis-contrato/disponiveis?eventoId=<id>
  Response: {
    variaveis: Record<string, any>, // Todas as variáveis com valores
    metadados: {
      configuracoes: string[], // Chaves das variáveis de configuração
      customizadas: string[], // Chaves das variáveis customizadas
      evento: string[] // Chaves das variáveis do evento (se eventoId fornecido)
    }
  }
  ```

#### **Atualizar `/api/modelos-contrato`**
- **GET**: Se autenticado, retorna modelos globais + modelos do usuário
- **POST**: Cria template personalizado (automaticamente atribuído ao `userId`)

#### **Atualizar `/api/modelos-contrato/[id]`**
- **GET/PUT/DELETE**: Com validação de permissão (só pode editar/deletar próprios templates)

#### **Atualizar `/api/contratos/preview`**
- **POST**: Aceita `eventoId` opcional para preencher variáveis automaticamente
  ```typescript
  POST /api/contratos/preview
  Body: {
    modeloContratoId?: string, // Opcional se for template personalizado
    template?: string, // Template direto (para preview durante edição)
    dadosPreenchidos?: Record<string, any>, // Dados manuais
    eventoId?: string // Se fornecido, preenche variáveis do evento
  }
  ```

---

## 🎨 FRONTEND

### **1. Página: Gerenciar Variáveis**
**Arquivo**: `src/app/contratos/variaveis/page.tsx`

**Funcionalidades:**
- Lista todas as variáveis customizadas do usuário
- Botão "Nova Variável"
- Editar/Deletar variáveis
- Indicador visual do tipo (única vs múltipla)
- Ordenação por `ordem`

**Componentes:**
- `VariavelForm` - Formulário para criar/editar variável
- `VariavelList` - Lista de variáveis com ações

### **2. Página: Editor de Templates**
**Arquivo**: `src/app/contratos/templates/novo/page.tsx` e `/templates/[id]/page.tsx`

**Funcionalidades:**
- Editor de texto rico (ou textarea com syntax highlighting)
- Sidebar com lista de variáveis disponíveis
- Autocomplete ao digitar `{{` ou `[`
- Preview ao lado (ou aba)
- Botão "Salvar Template"
- Validação de variáveis não definidas

**Componentes:**
- `TemplateEditor` - Editor principal
- `VariaveisSidebar` - Lista de variáveis disponíveis (clicável para inserir)
- `TemplatePreview` - Preview do template processado
- `VariavelAutocomplete` - Autocomplete ao digitar

**Estrutura:**
```
┌─────────────────────────────────────────────────┐
│  [Nome do Template] [Salvar] [Preview]          │
├──────────────┬───────────────────────────────────┤
│              │                                    │
│ Variáveis    │  Editor de Template               │
│ Disponíveis  │  (textarea ou rich text)          │
│              │                                    │
│ • {{nome}}   │  <h1>Contrato</h1>                │
│ • [servicos] │  Cliente: {{nome_cliente}}        │
│ • {{data}}   │  Serviços: [tipos_servico]       │
│              │                                    │
│ [Inserir]    │                                    │
└──────────────┴───────────────────────────────────┘
```

### **3. Página: Lista de Templates**
**Arquivo**: `src/app/contratos/templates/page.tsx`

**Funcionalidades:**
- Lista templates globais + templates do usuário
- Indicador visual (global vs. personalizado)
- Criar novo template
- Editar/Deletar templates próprios
- Preview rápido

### **4. Atualizar: Criar Contrato**
**Arquivo**: `src/app/contratos/novo/page.tsx`

**Fluxo atualizado:**
1. **Passo 1**: Selecionar template (globais + próprios)
2. **Passo 2**: Se template personalizado → variáveis já preenchidas (configuração + evento se houver)
3. **Passo 2**: Se template global → preencher campos como antes
4. **Passo 3**: Preview e gerar

**Melhorias:**
- Se criar a partir de evento → pré-seleciona template e pré-preenche variáveis
- Mostrar variáveis customizadas do usuário na lista de campos

### **5. Atualizar: Criar Contrato a partir de Evento**
**Arquivo**: `src/app/eventos/[id]/contrato/page.tsx` (ou similar)

**Funcionalidades:**
- Botão "Gerar Contrato" no evento
- Modal/Dialog: selecionar template
- Preview com variáveis do evento já preenchidas
- Gerar em um clique

---

## 🔄 FLUXO DE PROCESSAMENTO

### **Processamento de Template**

```typescript
// 1. Obter todas as variáveis disponíveis
const variaveis = await ContratoService.obterVariaveisParaTemplate(userId, eventoId);

// 2. Processar template
const html = TemplateService.processarPlaceholders(template, variaveis);

// 3. Processamento interno:
// - {{variavel}} → substitui por valor string
// - [variavel] → substitui por array formatado como "item1, item2, item3"
// - {{#if variavel}}...{{/if}} → processa condicionais (já existe)
```

### **Exemplo de Template:**
```html
<h1>Contrato de Prestação de Serviços</h1>
<p>Cliente: {{nome_cliente}}</p>
<p>Serviços: [tipos_servico]</p>
<p>Data: {{data_evento}}</p>
<p>Empresa: {{nome_fantasia}}</p>
```

### **Exemplo de Processamento:**
```typescript
const variaveis = {
  nome_cliente: "Pedro Miguel",
  tipos_servico: ["clickse 360", "totem fotográfico", "instaclick"], // Array
  data_evento: "2025-01-15",
  nome_fantasia: "Click-se Hub"
};

// Resultado:
// <h1>Contrato de Prestação de Serviços</h1>
// <p>Cliente: Pedro Miguel</p>
// <p>Serviços: clickse 360, totem fotográfico, instaclick</p>
// <p>Data: 15 de janeiro de 2025</p>
// <p>Empresa: Click-se Hub</p>
```

---

## 📊 MAPEAMENTO DE VARIÁVEIS

### **Variáveis de Configuração (já existem)**
Mapeadas de `ConfiguracaoContrato`:
- `razao_social`, `nome_fantasia`, `cnpj`, `inscricao_estadual`
- `endereco_empresa`, `bairro_empresa`, `cidade_empresa`, `estado_empresa`, `cep_empresa`
- `telefone_empresa`, `email_empresa`, `site_empresa`
- `banco`, `agencia`, `conta`, `tipo_conta`, `pix`
- `foro_eleito`

### **Variáveis de Evento (já existem)**
Mapeadas de `Evento`:
- `nome_evento`, `tipo_evento`, `data_evento`
- `local_evento`, `endereco_evento`
- `horario_inicio`, `horario_termino`, `duracao_servico`
- `numero_convidados`, `valor_total`, `valor_total_formatado`
- `nome_contratante`, `cpf_contratante`, `email_contratante`, `telefone_contratante`
- `endereco_contratante`, `cep_contratante`
- `tipo_servico` (string simples)
- `[tipos_servico]` (array formatado como string) - **NOVO**

### **Variáveis Customizadas (novo)**
Criadas pelo cliente em `variaveis_contrato`:
- Tipo `unica`: `{{chave}}` → valor string
- Tipo `multipla`: `[chave]` → array formatado como string

---

## 🛠️ IMPLEMENTAÇÃO - ORDEM DE EXECUÇÃO

### **Fase 1: Backend - Estrutura de Dados**
1. ✅ Criar migration SQL para `variaveis_contrato`
2. ✅ Criar migration SQL para adicionar `user_id` em `modelos_contrato`
3. ✅ Atualizar interfaces TypeScript
4. ✅ Criar `VariavelContratoRepository`
5. ✅ Atualizar `ModeloContratoRepository` para suportar `userId`

### **Fase 2: Backend - Serviços**
1. ✅ Criar `VariavelContratoService`
2. ✅ Atualizar `ContratoService.obterVariaveisParaTemplate()`
3. ✅ Atualizar `TemplateService.processarPlaceholders()` para suportar `[variavel]`
4. ✅ Atualizar `TemplateService.extrairPlaceholders()` para ambos os tipos

### **Fase 3: Backend - APIs**
1. ✅ Criar `/api/variaveis-contrato`
2. ✅ Criar `/api/variaveis-contrato/[id]`
3. ✅ Criar `/api/variaveis-contrato/disponiveis`
4. ✅ Atualizar `/api/modelos-contrato` (GET/POST)
5. ✅ Criar `/api/modelos-contrato/[id]` (GET/PUT/DELETE)
6. ✅ Atualizar `/api/contratos/preview`

### **Fase 4: Frontend - Gerenciamento de Variáveis**
1. ✅ Criar página `/contratos/variaveis`
2. ✅ Criar componente `VariavelForm`
3. ✅ Criar componente `VariavelList`
4. ✅ Integrar com API

### **Fase 5: Frontend - Editor de Templates**
1. ✅ Criar página `/contratos/templates/novo`
2. ✅ Criar componente `TemplateEditor`
3. ✅ Criar componente `VariaveisSidebar`
4. ✅ Criar componente `TemplatePreview`
5. ✅ Implementar autocomplete
6. ✅ Criar página `/contratos/templates/[id]` (editar)

### **Fase 6: Frontend - Lista de Templates**
1. ✅ Criar página `/contratos/templates`
2. ✅ Listar globais + próprios
3. ✅ Ações: criar, editar, deletar, preview

### **Fase 7: Frontend - Integração**
1. ✅ Atualizar `/contratos/novo` para usar templates personalizados
2. ✅ Atualizar criação de contrato a partir de evento
3. ✅ Melhorar preview com variáveis do evento

---

## 🧪 TESTES

### **Cenários de Teste:**
1. ✅ Criar variável customizada (única e múltipla)
2. ✅ Criar template personalizado usando variáveis
3. ✅ Gerar contrato a partir de template + evento
4. ✅ Gerar contrato a partir de template + dados manuais
5. ✅ Preview de template com variáveis
6. ✅ Validação de variáveis não definidas
7. ✅ Processamento de `{{variavel}}` e `[variavel]`
8. ✅ Editar/deletar variáveis e templates próprios
9. ✅ Não permitir editar/deletar templates globais

---

## 📝 NOTAS TÉCNICAS

### **Editor de Template:**
- **Opção 1**: Textarea simples com syntax highlighting (Monaco Editor ou CodeMirror)
- **Opção 2**: Editor WYSIWYG (TinyMCE, Quill) com modo código
- **Recomendação**: Textarea com Monaco Editor (mesmo do VS Code) para melhor experiência

### **Autocomplete:**
- Detectar digitação de `{{` ou `[`
- Mostrar lista de variáveis disponíveis
- Inserir ao selecionar

### **Validação:**
- Ao salvar template, validar se todas as variáveis usadas existem
- Mostrar avisos para variáveis não definidas
- Permitir salvar mesmo com avisos (variáveis podem ser preenchidas depois)

### **Performance:**
- Cache de variáveis disponíveis (não buscar toda vez)
- Lazy load de templates na lista
- Preview debounced (não processar a cada keystroke)

---

## 🔐 SEGURANÇA

- ✅ Usuário só pode criar/editar/deletar suas próprias variáveis
- ✅ Usuário só pode criar/editar/deletar seus próprios templates
- ✅ Usuário não pode editar/deletar templates globais
- ✅ Validação de `userId` em todas as operações
- ✅ Sanitização de HTML no template (prevenir XSS)

---

## 📚 REFERÊNCIAS

- Sistema atual de templates: `src/lib/services/template-service.ts`
- Configuração de contrato: `src/lib/repositories/supabase/configuracao-contrato-supabase-repository.ts`
- Processamento de eventos: `src/lib/services/contrato-service.ts`

---

**Status**: 📋 Plano completo e detalhado. Pronto para implementação fase por fase.
