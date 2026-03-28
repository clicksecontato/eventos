# Plano: múltiplos signatários, partes e auditoria temporal de contratos

## 1. Situação atual no projeto (baseline)

Hoje o domínio de contrato está orientado a **um fluxo principal de conclusão**:

- **`contratos`**: um `status` global (`rascunho` → `gerado` → `assinado` / `cancelado`), um `pdf_path`, `assinatura_auditoria` como **JSON único** (última assinatura “ganha” o registro estruturado).
- **`contratos_assinatura_convites`**: convites por link com **um destinatário** por linha; ao assinar, o contrato costuma ir para `assinado` e o convite para `assinado`.
- **Assinatura interna (logada)**: também atualiza o mesmo contrato para `assinado` com uma auditoria única.

Ou seja: o modelo atual é **compatível com “um contrato, uma rodada de assinatura que encerra o documento”**, não com **N signatários obrigatórios**, **papéis (partes)** nem **histórico imutável** de alterações.

---

## 2. O que o mercado costuma oferecer (Contraktor e similares)

### 2.1 Múltiplas pessoas no mesmo contrato

- **Ordem**: assinatura **sequencial** (A → B → C) ou **paralela** (todos recebem link ao mesmo tempo).
- **Regra de fechamento**: exigir **todas** as assinaturas (ou um subconjunto, ex.: “qualquer um dos sócios”) para considerar o documento **concluído**.
- **Versão do documento**: todos assinam o **mesmo PDF (mesmo hash)** ou versões encadeadas (menos comum em contrato simples).

### 2.2 Partes (papéis)

- Cadastro de **partes** com **papel**: ex. *Contratante*, *Contratada*, *Testemunha*, *Fiador*, *Representante legal*.
- Cada parte pode ter **uma ou mais** pessoas (ex.: dois sócios como contratantes).
- O convite / obrigação de assinar fica ligado à **parte + pessoa** (ou só à pessoa com `papel` redundante para consulta).

### 2.3 Auditoria e rastreamento no tempo

Dois eixos complementares:

| Eixo | Objetivo |
|------|----------|
| **Auditoria de processo** | Quem acessou, OTP, IP, hash do PDF, convite, carimbo de tempo (opcional). |
| **Auditoria de conteúdo / ciclo de vida** | Histórico de **edições**, **geração de PDF**, **troca de modelo**, **cancelamento**, **reabertura** — linha do tempo **append-only** (não editar eventos passados). |

---

## 3. Modelo de dados proposto (alto nível)

### 3.1 Partes e signatários

Sugestão de novas entidades (nomes ilustrativos):

- **`contrato_partes`**
  - `id`, `contrato_id`, `user_id` (tenant), `papel` (enum ou texto controlado), `ordem_assinatura` (nullable se paralelo), `obrigatoria` (bool), `data_cadastro`.
- **`contrato_parte_signatarios`** (ou incorporar na parte se for 1:1)
  - Liga **parte** ↔ **pessoa**: nome, e-mail, documento opcional, `tipo_acesso` (`link_publico` | `usuario_interno`).
  - Estado: `pendente` | `convite_enviado` | `assinado` | `recusado` | `expirado`.

**Convites** (`contratos_assinatura_convites`) passam a referenciar **`contrato_parte_signatario_id`** (ou `parte_id` + e-mail), em vez de ser o único eixo do fluxo externo.

### 3.2 Estado do contrato

Opções (escolher uma estratégia e manter compatibilidade com o legado):

- **A)** Manter `status` em `contratos` e acrescentar **`assinatura_status_agregado`**: `coletando_assinaturas` | `concluido` | `cancelado`, enquanto `assinado` legado mapeia para `concluido`.
- **B)** Substituir gradualmente `assinado` por estados explícitos e migração de dados.

Regra de negócio: `concluido` só quando **todas** as partes obrigatórias com signatário obrigatório estiverem `assinado` (e política de ordem respeitada, se sequencial).

### 3.3 Auditoria temporal (append-only)

- **`contrato_eventos_auditoria`** (ou `contratos_historico`)
  - `id`, `contrato_id`, `user_id` (quem causou o evento; null se sistema), `tipo_evento` (enum), `payload` (JSONB), `hash_conteudo_antes` / `hash_conteudo_depois` (opcional), `criado_em`.
  - **Sem UPDATE/DELETE** na aplicação (apenas INSERT); RLS no Supabase alinhado ao `user_id` do contrato.

**Tipos de evento** (exemplos):

- `contrato_criado`, `conteudo_alterado`, `pdf_gerado`, `pdf_regenerado`, `modelo_alterado`
- `parte_adicionada`, `parte_removida`, `signatario_convite_criado`, `otp_enviado`, `otp_verificado`
- `assinatura_registrada` (com referência ao signatário e hash do PDF naquele momento)
- `contrato_cancelado`, `link_revogado`

**PDF final**: pode ser o último da cadeia ou um “pacote” com várias páginas de assinatura — ver fase de implementação.

### 3.4 Auditoria por assinatura (múltiplas)

- Trocar (ou complementar) `assinatura_auditoria` único por:
  - **`contrato_assinaturas`** (tabela): uma linha por assinatura, com `hash_pdf_antes`, `hash_pdf_depois` *daquele passo*, `signatario_id`, IP, UA, `modalidade`, etc.
  - Ou manter JSONB em `contratos` como **resumo** e a verdade detalhada na tabela (recomendado para relatórios).

---

## 4. Fluxos de produto

### 4.1 Configuração (dono do tenant)

1. Ao gerar contrato, definir **partes** e **quem deve assinar**.
2. Escolher **sequencial** ou **paralelo** e ordem (se sequencial).
3. Gerar convites por signatário (ou um convite “multiuso” por signatário com token único — preferível **um token por pessoa**).

### 4.2 Assinatura

1. Cada signatário completa OTP (se aplicável), ciência e manuscrita (ou fluxo interno).
2. Cada conclusão grava **evento** + **linha em `contrato_assinaturas`** + atualiza PDF (incremental ou regenerado).
3. Quando a política for satisfeita, marca contrato como **concluído** e dispara notificações (e-mail, etc.).

### 4.3 Consulta / prova

1. Tela ou exportação: **linha do tempo** de eventos.
2. PDF final com **todas** as páginas de assinatura ou sumário com hashes e IDs de evento.

---

## 5. Plano de implementação por fases

### Fase 0 — Decisões de produto (curta)

- [ ] Sequencial vs paralelo na v1 (recomenda-se **paralelo** primeiro — menos complexidade).
- [ ] Lista mínima de **papéis** (enum fixo vs texto livre com sugestões).
- [ ] Comportamento legado: contratos já `assinado` permanecem válidos; novos fluxos usam o modelo novo quando flag/plano permitir.

### Fase 1 — Auditoria de ciclo de vida (baixo risco, alto valor)

- [ ] Criar `contrato_eventos_auditoria` + migração.
- [ ] Serviço `ContratoAuditoriaService` (ou método no `ContratoService`) que **sempre** insere evento em: criação, salvamento de HTML, geração de PDF, mudança de status, revogação de convite.
- [ ] UI: aba “Histórico” na página do contrato (lista cronológica).

**Entrega**: rastreamento temporal de **alterações e ações**, sem ainda múltiplos signatários.

### Fase 2 — Partes e signatários (modelo de dados + API)

- [ ] Tabelas `contrato_partes` e `contrato_parte_signatarios` (ou equivalente).
- [ ] CRUD na API (autenticado) e UI no wizard do contrato **antes** de gerar links.
- [ ] Migração: contratos existentes sem partes → uma parte padrão “Cliente” opcional para não quebrar listagens.

### Fase 3 — Múltiplas assinaturas no PDF e estado agregado

- [ ] Tabela `contrato_assinaturas` (uma linha por assinatura).
- [ ] Ajustar `POST assinar` (link e interno) para **anexar** página de assinatura ao PDF atual (pdf-lib) em vez de substituir estado único, ou regenerar documento base + todas as assinaturas.
- [ ] Política: `coletando_assinaturas` até última assinatura obrigatória; só então `assinado` / `concluido`.
- [ ] Convites: um por signatário; FK para `contrato_parte_signatario_id`.

### Fase 4 — Ordem sequencial e refinamentos

- [ ] Fila de “próximo signatário habilitado” (bloquear convite ou exibir mensagem se fora da ordem).
- [ ] Notificações automáticas quando a vez do próximo abrir.
- [ ] Relatórios e exportação CSV/PDF do histórico para auditoria externa.

### Fase 5 — Opcional (fora de ICP, mas fortalece prova)

- [ ] Carimbo de tempo (TSA) em eventos críticos.
- [ ] Hash do HTML/conteúdo em cada `pdf_gerado` para prova de “o que foi exibido”.

---

## 6. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Migração de contratos antigos | Manter colunas atuais; novo fluxo atrás de feature flag ou tipo de contrato. |
| PDF muito grande (muitas páginas de assinatura) | Página única “quadro de assinaturas” compacto ou limite de signatários na v1. |
| RLS / multi-tenant | Todo SELECT/INSERT em eventos e partes com `user_id` do contrato. |
| Complexidade de UI | Fase 1 só histórico; partes na Fase 2; múltiplas assinaturas na Fase 3. |

---

## 7. Alinhamento com a arquitetura do projeto

- **RepositoryFactory / ContratoRepository**: novos repositórios para `contrato_partes`, `contrato_eventos_auditoria`, `contrato_assinaturas`.
- **ServiceFactory**: orquestrar criação de eventos junto com updates de contrato (transação lógica: falha no evento → logar erro crítico ou retry).
- **API Routes**: estender rotas existentes de convite/assinar para aceitar `signatarioId` e validar política.
- **Frontend**: página do contrato com seções Partes, Signatários, Histórico.

---

## 8. Resumo executivo

- **Múltiplos signatários** exige deixar de tratar `assinado` como “primeiro que assinar encerra” e passar a ter **estado agregado** + **N registros de assinatura** + PDF acumulativo ou regenerado.
- **Partes** são uma camada de **negócio/jurídico** (papéis) ligada a **pessoas** que assinam.
- **Auditoria no tempo** é melhor implementada como **tabela append-only de eventos**, separada do JSON único em `contratos`, com tipos de evento estáveis e payloads em JSONB.

Este documento serve como referência para priorizar backlog; a ordem sugerida (Fase 1 → 4) entrega valor incremental sem big-bang.
