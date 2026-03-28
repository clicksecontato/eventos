# Aplicar migrações no Supabase remoto (Fase 1 auditoria + Fase 2 partes)

## Contexto

O repositório não expõe `DATABASE_URL` no `.env` (apenas `NEXT_PUBLIC_SUPABASE_*` e `SUPABASE_SERVICE_ROLE_KEY`). Por isso **não dá para rodar `psql` ou `db push` sem vincular o projeto** à CLI ou sem colar SQL no painel.

Foi executado `npx supabase init`, gerando `supabase/config.toml`. Scripts npm:

- `npm run supabase:link` — `npx supabase link` (pede login e ref do projeto)
- `npm run supabase:db:push` — `npx supabase db push` (aplica `supabase/migrations/*.sql` pendentes no remoto linkado)

`[db.seed].enabled` foi desligado no `config.toml` porque não existe `supabase/seed.sql` (evita confusão em `db reset` local).

`.gitignore` passou a ignorar `/supabase/.temp/` (estado da CLI após `link`).

## Opção A — CLI (recomendado após link)

1. `npx supabase login`
2. `npm run supabase:link` — informe o **Project ref** (Dashboard → Settings → General) e a **senha do banco** quando solicitado.
3. Confirme no Dashboard que a versão do Postgres bate com `[db].major_version` em `supabase/config.toml` (hoje `17`). Se o projeto for 15, ajuste `major_version` antes de fluxos locais; `db push` costuma funcionar mesmo assim para DDL simples.
4. `npm run supabase:db:push`

## Opção B — SQL Editor (sem CLI)

No Supabase: **SQL Editor**, executar **em ordem** os arquivos em `supabase/migrations/` que ainda não rodaram no seu projeto, no mínimo:

- `20260327100000_contrato_eventos_auditoria.sql`
- `20260327120000_contrato_partes_signatarios.sql`

Se ainda não aplicou a cadeia de assinatura pública/OTP, rodar antes as migrações com timestamp `20260325*`, `20260326*`, `20260326120000_*` conforme o histórico do seu banco.

## Verificação rápida

- Tabela `contrato_eventos_auditoria` existe.
- Tabelas de partes/signatários (conforme `20260327120000_*`) existem.
- App sem erros ao abrir contrato (abas Histórico / Partes).

## Arquivos alterados neste passo

| Arquivo | Função |
|---------|--------|
| `supabase/config.toml` | Config padrão da CLI; seed desligado. |
| `package.json` | Scripts `supabase:db:push` e `supabase:link`. |
| `.gitignore` | Ignora `supabase/.temp/`. |
| `step-by-step/aplicar-migracoes-supabase-remoto.md` | Este guia. |
