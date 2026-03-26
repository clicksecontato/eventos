# Correção — contratos: colunas opcionais e schema cache do PostgREST

## Sintomas

- Ao **criar** contrato: `Could not find the 'conteudo_html' column of 'contratos' in the schema cache`
- Ao **assinar** PDF (`POST .../assinar-pdf`): `Could not find the 'assinatura_auditoria' column ...` (ou `pdf_path_original`)

## Causa

O banco Supabase em uso **não tem essas colunas** (migrations do repo não aplicadas) **ou** o PostgREST está com **cache de schema** desatualizado.

## Correção no banco (SQL)

Execute no **SQL editor** do Supabase (pode rodar tudo de uma vez):

```sql
ALTER TABLE contratos
ADD COLUMN IF NOT EXISTS conteudo_html TEXT;

COMMENT ON COLUMN contratos.conteudo_html IS
'HTML do contrato editado pelo usuário antes de salvar. Usado no PDF quando preenchido; senão, processa o template com dados_preenchidos.';

ALTER TABLE contratos ADD COLUMN IF NOT EXISTS pdf_path_original VARCHAR(500);
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS assinatura_auditoria JSONB;

COMMENT ON COLUMN contratos.pdf_path_original IS 'S3 key do PDF gerado antes de incorporar a assinatura manuscrita.';
COMMENT ON COLUMN contratos.assinatura_auditoria IS 'Metadados da assinatura: hashes SHA-256, IP, user-agent, data ISO, IDs do signatário.';
```

Equivalente no repositório: `supabase/migrations/add_conteudo_html_contratos.sql` e `supabase/migrations/20260325120000_contratos_assinatura_interna.sql`.

## Atualizar schema cache do PostgREST

```sql
NOTIFY pgrst, 'reload schema';
```

## Mitigação no código

Em `src/lib/repositories/supabase/contrato-supabase-repository.ts`:

- **Insert/update** repetem a operação **sem** colunas opcionais (`conteudo_html`, `pdf_path_original`, `assinatura_auditoria`) se o PostgREST acusar que a coluna não está no schema cache — assim a assinatura e o cadastro não ficam bloqueados, mas **auditoria / cópia do path original** só persistem depois da migration + reload.
