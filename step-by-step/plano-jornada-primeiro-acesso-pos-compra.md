# Plano: Jornada de primeiro acesso pós-compra (Clicksehub)

## Contexto

Hoje, quando alguém **compra um plano pela Hotmart** e não tem conta no Clicksehub:

1. O webhook `PURCHASE_APPROVED`:
   - Pré-cadastra o usuário no Firebase Auth **sem senha** (`createUser` só com email e `emailVerified`).
   - Cria/atualiza o documento em `assinaturas` e sincroniza em `user.assinatura`.
   - **Não envia nenhum e-mail** do Clicksehub.

2. O usuário recebe apenas o e-mail da **Hotmart** (confirmação de compra), que não fala em acessar o sistema.

3. Para entrar, ele precisa:
   - Descobrir a URL do produto (Clicksehub).
   - Ir em “Esqueci minha senha” e usar o mesmo e-mail da compra.
   - Receber o link de redefinição e definir a senha na primeira vez.

Problemas: nada explica que a conta já existe, que deve usar o e-mail da compra, nem que o caminho é “Esqueci minha senha”. A jornada fica pouco intuitiva.

---

## Objetivos

1. **Comunicar claramente** que a conta foi criada e como acessar.
2. **Enviar um link direto** para definir a senha no primeiro acesso, sem precisar adivinhar o fluxo.
3. **Deixar a tela “Esqueci minha senha”** (e, se fizer sentido, o login) mais amigável para quem acabou de comprar.

---

## Premissas técnicas

- **E-mail**: Resend (`RESEND_API_KEY`) e `sendEmail` já existem.
- **Link “definir senha”**: mesmo mecanismo do “redefinir senha”: Firebase `generatePasswordResetLink` + token curto em `password_reset_tokens` + URL `/redefinir-senha?token=X`. A página `/redefinir-senha` já define a nova senha; podemos reaproveitá-la para o primeiro acesso.
- **Quando disparar**: somente para **usuário novo** (pré-cadastrado no `PURCHASE_APPROVED`). Usuário que já existia e só ganhou/alterou plano pode ter outro e-mail em fases futuras.

---

## Proposta de solução

### 1. E-mail “Bem-vindo + Definir senha” (após compra, usuário novo)

**Momento:** no `processarWebhook`, após `processarCompra` com sucesso, **apenas quando `isNewUser === true`** (ou seja, acabou de passar por `preCadastrarUsuario`).

**Conteúdo sugerido:**

- **Assunto:** `Bem-vindo ao Clicksehub! Defina sua senha para acessar`
- **Corpo:**
  - Saudação com o nome.
  - Confirmação: compra aprovada e conta criada.
  - Onde acessar: `[NEXT_PUBLIC_APP_URL]/painel` (ou URL do produto).
  - **Um único CTA em destaque:** “Definir minha senha” → link `/redefinir-senha?token=XXX`.
  - Texto curto: “Como é seu primeiro acesso, você precisa definir uma senha. Use o botão acima.”
  - Validade do link: “Este link é válido por 24 horas. Se expirar, acesse o sistema e use **Esqueci minha senha** com o mesmo e-mail da compra.”

**Implementação:**

- **Template:** nova função em `email-service.ts`, por exemplo `generateFirstAccessEmailTemplate(nome, resetUrl)`.
- **Geração do link:** reutilizar a lógica de `/api/auth/reset-password`:
  - `adminAuth.generatePasswordResetLink(email, { url: .../redefinir-senha })`
  - `oobCode` do link gerado.
  - Token curto (`generateShortToken`), `expiresAt` = agora + **24h** (primeiro acesso mais tolerante que o reset “esqueci senha”, que pode manter 1h).
  - Gravar com `AdminPasswordResetTokenRepository.createToken({ token, email, firebaseCode: oobCode, expiresAt })`.
  - URL final: `{NEXT_PUBLIC_APP_URL}/redefinir-senha?token={shortToken}`.
- Para evitar duplicar código, extrair um helper usado por **reset-password** e pelo **webhook**, por exemplo:
  - `createPasswordResetLink(email, options?: { expiryHours?: number }) => Promise<{ resetUrl: string }>`
  - `reset-password`: `expiryHours: 1`.
  - Webhook (primeiro acesso): `expiryHours: 24`.
- **Envio:** no `HotmartWebhookService.processarWebhook`:
  - Antes do `if (!user)`, definir `let isNewUser = false`.
  - Dentro do `if (!user)` que chama `preCadastrarUsuario`: `isNewUser = true`.
  - No `case 'purchase'`, após `result = await this.processarCompra(...)` e antes do `break`:
    - `if (isNewUser) { await this.enviarEmailPrimeiroAcesso(user, plano); }`
  - `enviarEmailPrimeiroAcesso` (novo método ou função chamada pelo serviço):
    - `createPasswordResetLink(user.email, { expiryHours: 24 })` → `resetUrl`.
    - `generateFirstAccessEmailTemplate(user.nome, resetUrl)`.
    - `sendEmail({ to: user.email, subject: '...', html })`.
    - Em falha de envio: **apenas log**; não falhar o webhook.

**Dependências do webhook para enviar e-mail:**

- `adminAuth` (Firebase Admin) – já usado em `preCadastrarUsuario`.
- `AdminPasswordResetTokenRepository` – instanciar no webhook ou receber por injeção.
- `sendEmail` e `generateFirstAccessEmailTemplate` – importar dos serviços existentes.

O `HotmartWebhookService` hoje não recebe `adminAuth` nem o repositório de token. Opções:

- **A)** Passar no construtor (ou como dependência opcional) e, se não houver, não enviar o e-mail.
- **B)** Importar `adminAuth` de `firebase-admin` e instanciar `AdminPasswordResetTokenRepository` dentro de `enviarEmailPrimeiroAcesso` (ou de um pequeno módulo `primeiro-acesso-email` que encapsula link + envio).

Recomendação: **B** por simplicidade; o webhook já importa `adminAuth` para `preCadastrarUsuario`.

---

### 2. Ajustes na tela “Esqueci minha senha”

**Objetivo:** quem não recebeu o e-mail, recebeu com atraso ou o link expirou consiga se orientar.

**Alteração em `/esqueci-senha`:**

- No `CardDescription` ou num texto de ajuda **acima ou abaixo** do formulário, adicionar:

  > **Acabou de comprar o Clicksehub?** Use o **mesmo e-mail da compra** neste formulário para receber um link e **definir sua senha de acesso**. Não é preciso ter senha antiga.

- Manter o fluxo atual: mesmo endpoint e mesma lógica de “redefinir senha”; a mensagem deixa claro que “definir” também se resolve ali.

---

### 3. Ajustes na tela de login (opcional, fase 1)

**Objetivo:** primeiro contato visual com a dica, para quem foi direto ao login.

**Alteração em `/login` (ou no componente usado em `/painel`):**

- Perto do link “Esqueci minha senha”, adicionar uma linha:

  > **Primeira vez aqui?** Defina sua senha em [Esqueci minha senha].

- Ou um texto único: “Primeira vez? Use **Esqueci minha senha** com seu e-mail para definir a senha de acesso.”

Pode ser implementado já na primeira fase ou deixado para uma iteração seguinte.

---

### 4. Reaproveitar a página `/redefinir-senha`

- **Manter** a rota `/redefinir-senha` e o fluxo `token` → `resolve-reset-token` → `verify-reset-code` / `confirm-reset-password`.
- **Não** criar rota nova do tipo `/primeiro-acesso`; o link do e-mail de boas-vindas aponta para `/redefinir-senha?token=...`.
- O título “Redefinir senha” ainda faz sentido para quem está definindo a senha pela primeira vez. Se no futuro quiser diferenciar o copy (ex. “Definir senha” quando for primeiro acesso), pode-se tentar inferir pelo contexto (ex. token gerado por “primeiro acesso”), mas **não é necessário para a primeira versão**.

---

### 5. Validade do link

- **Esqueci minha senha:** manter **1 hora** (comportamento atual).
- **Primeiro acesso (pós-compra):** **24 horas**.
  - Só é possível se o helper `createPasswordResetLink` aceitar `expiryHours` e o `expiresAt` do token for `agora + expiryHours`.
  - O link do Firebase (`oobCode`) pode ter validade própria; se for menor que 24h, o nosso token pode expirar depois. Nesse caso, ao clicar tardiamente, o usuário verá erro ao trocar a senha. O e-mail já orienta a usar “Esqueci minha senha” se o link expirar.
- Documentar no código e no passo a passo qual validade cada fluxo usa.

---

### 6. Hotmart

- O e-mail da Hotmart é controlado por eles; não é obrigatório mudar.
- Se no painel da Hotmart der para incluir uma linha do tipo: “Acesse o sistema em [URL] e use **Esqueci minha senha** com seu e-mail para definir a senha”, pode complementar. Nosso e-mail de boas-vindas é o principal.

---

## Resumo de mudanças por componente

| Componente | O que fazer |
|-----------|-------------|
| **HotmartWebhookService** | Marcar `isNewUser` quando `preCadastrarUsuario` for chamado; após `processarCompra` no `case 'purchase'`, se `isNewUser`, chamar `enviarEmailPrimeiroAcesso(user, plano)`. |
| **enviarEmailPrimeiroAcesso** (novo, no webhook ou em módulo) | Obter `resetUrl` via helper `createPasswordResetLink(email, { expiryHours: 24 })`, montar HTML com `generateFirstAccessEmailTemplate`, chamar `sendEmail`. Tratar erro só com log. |
| **createPasswordResetLink** (novo helper) | Extrair de `reset-password`: `generatePasswordResetLink`, token curto, `AdminPasswordResetTokenRepository.createToken`, `expiresAt` com `expiryHours`. Retornar `{ resetUrl }`. Parâmetro `expiryHours` (default 1). |
| **reset-password (route)** | Refatorar para usar `createPasswordResetLink(email, { expiryHours: 1 })` e o mesmo fluxo de token/template; remover duplicação. |
| **email-service** | Adicionar `generateFirstAccessEmailTemplate(nome, resetUrl)` com o texto de boas-vindas e CTA “Definir minha senha”. |
| **/esqueci-senha** | Incluir o texto para quem acabou de comprar (e-mail da compra + “definir senha”). |
| **/login** (opcional) | Incluir dica “Primeira vez? Defina sua senha em Esqueci minha senha.” |

---

## Ordem sugerida de implementação

1. **Helper `createPasswordResetLink`**  
   - Extrair lógica de `reset-password`, aceitar `expiryHours`, usar `AdminPasswordResetTokenRepository` e `adminAuth`.  
   - Colocar em `src/lib/services/password-link-service.ts` (ou `auth/password-reset-link.ts`).

2. **Refatorar `reset-password`**  
   - Usar `createPasswordResetLink(email, { expiryHours: 1 })` e o template já existente.

3. **`generateFirstAccessEmailTemplate`** em `email-service.ts`.

4. **`enviarEmailPrimeiroAcesso`**  
   - Dentro do `HotmartWebhookService` ou em um `primeiro-acesso-email-service` que o webhook chama.  
   - Usar `createPasswordResetLink`, `generateFirstAccessEmailTemplate`, `sendEmail`.

5. **`processarWebhook`**  
   - `isNewUser` + chamada a `enviarEmailPrimeiroAcesso` no `case 'purchase'`.

6. **Copy em `/esqueci-senha`.**

7. **(Opcional)** Copy em `/login` ou `/painel`.

---

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Resend falhar e atrasar o webhook | Envio em `try/catch`; em erro, só log. Webhook continua retornando sucesso. |
| Link de 24h mas `oobCode` do Firebase com menos de 24h | Mensagem no e-mail: “Se o link expirar, use Esqueci minha senha.” |
| Usuário não encontrar o e-mail | Texto em “Esqueci minha senha” e, se fizer, no login; Hotmart pode complementar. |
| `resolve-reset-token` ou repositório de token com regras que bloqueiam leitura | Garantir que `resolve-reset-token` use repositório que consiga ler `password_reset_tokens` (ex. Admin no servidor). Se hoje usar `repositoryFactory` (cliente), avaliar trocar para Admin na API. |

---

## Configuração necessária

- `RESEND_API_KEY` – já utilizada.
- `NEXT_PUBLIC_APP_URL` – já utilizada em `reset-password` e em outros fluxos; precisa estar correta em produção para os links do e-mail.
- Firebase Admin – já em uso no webhook e no reset.

---

## Critérios de sucesso

1. Usuário **novo** que compra via Hotmart e é pré-cadastrado **recebe e-mail do Clicksehub** com:
   - Boas-vindas, confirmação da compra e URL do sistema.
   - Botão/link direto para definir a senha (`/redefinir-senha?token=...`).
   - Instrução sobre validade e o que fazer se expirar.

2. Em **“Esqueci minha senha”**, há texto claro para quem “acabou de comprar” e precisa definir a senha.

3. O fluxo de **definir senha** (primeiro acesso) usa a **mesma** página e o **mesmo** fluxo de redefinição, sem novas rotas ou fluxos paralelos.

4. Falha no envio do e-mail **não** quebra o webhook e **não** impede a criação da conta e da assinatura.

---

## Fases futuras (fora do escopo inicial)

- E-mail quando o **plano é atualizado** para quem já era usuário (ex. upgrade).
- Página ou copy específico “Definir senha” em `/redefinir-senha` quando o token for de primeiro acesso (se for possível identificar).
- Rastrear “primeiro acesso concluído” (ex. `senhaDefinida` no `user`) para relatórios ou para esconder dicas depois.
- Integração ou menção no e-mail/fluxo da Hotmart (se der e fizer sentido).
