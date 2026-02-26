# Replicacao do sistema por cliente (isolado)

## Objetivo

Este documento descreve o minimo necessario para replicar o sistema para cada cliente com infraestrutura isolada, usando contas proprias do cliente em cada servico (Vercel, AWS, Google, etc.).

Escopo desta versao:
- sem sistema de pagamento/assinatura para o cliente final;
- com separacao de custo por cliente (cada cliente paga os proprios recursos).

## Quantos e-mails sao necessarios

### Minimo viavel: 2 e-mails
- `infra@cliente.com`: acesso tecnico e dono das contas de infraestrutura.
- `noreply@dominio-do-cliente.com`: remetente transacional (emails do sistema).

### Recomendado: 4 e-mails
- `infra@cliente.com`: operacao tecnica e administracao.
- `financeiro@cliente.com`: faturamento e recebimento de invoices.
- `noreply@dominio-do-cliente.com`: envio automatico.
- `suporte@cliente.com`: contato operacional/suporte.

Observacao:
- E possivel reutilizar o mesmo email em varios provedores, mas separar por funcao melhora governanca, seguranca e auditoria.

## Contas necessarias por cliente

### Obrigatorias
1. **Vercel**
   - Deploy do Next.js
   - Variaveis de ambiente
   - Dominio da aplicacao

2. **Supabase**
   - Banco de dados principal (Postgres)
   - Chaves de acesso (`anon` e `service_role`)

3. **Google Cloud + Firebase** (mesmo projeto)
   - Firebase Auth
   - Firestore
   - Conta de servico para operacoes server-side

4. **AWS**
   - S3 para anexos/comprovantes/arquivos
   - Usuario IAM com permissoes minimas necessarias

5. **Resend**
   - Envio de email transacional
   - Dominio verificado (SPF/DKIM)

6. **Provedor de dominio/DNS** (Cloudflare, Registro.br, etc.)
   - DNS da aplicacao
   - Configuracoes de email (SPF, DKIM, DMARC)

Resumo:
- Total recomendado por cliente: **6 contas/plataformas obrigatorias**.

### Opcionais (por feature)
- **Google OAuth/Calendar**: apenas se usar integracao de calendario.
- **Gemini/IA**: apenas se houver features de IA habilitadas.
- **API de gamificacao externa**: apenas se esse modulo estiver ativo.

## Ajustes para versao sem pagamento

Para clones sem monetizacao:
- remover/desativar integracao Hotmart;
- remover/desativar webhooks de assinatura e cobranca;
- remover secrets relacionados a pagamento;
- manter somente os modulos funcionais contratados pelo cliente.

## Checklist de onboarding por cliente

1. Criar emails (`infra`, `financeiro`, `noreply`, `suporte`).
2. Criar contas: Vercel, Supabase, Google/Firebase, AWS, Resend, DNS.
3. Criar projeto novo em cada plataforma (na conta do cliente).
4. Gerar credenciais novas por cliente (nunca reutilizar).
5. Configurar dominio e certificados.
6. Configurar variaveis de ambiente no Vercel.
7. Publicar ambiente de homologacao.
8. Validar fluxo de login, CRUD e upload de arquivos.
9. Validar envio de emails transacionais.
10. Publicar producao e monitorar primeiros acessos.

## Seguranca e compliance

- Nunca compartilhar credenciais entre clientes.
- Nunca commitar `.env` com chaves reais.
- Rotacionar chaves periodicamente.
- Aplicar principio de menor privilegio (IAM/Service Accounts).
- Manter backup e observabilidade por cliente.

## Observacao importante

Este mapeamento considera o stack atual do projeto (Next.js + Supabase + Firebase + AWS + Resend). Se novas integracoes forem ativadas, incluir as contas correspondentes no checklist do cliente.
