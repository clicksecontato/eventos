# Runbook: manter a versão estável e fazer rollback com segurança

Este projeto já evoluiu com **assinatura eletrônica**, **mock de e-mail (RESEND_MOCK)**, **auditoria de contrato (Fase 1)** e ajustes em convites. Este documento descreve como **voltar ao estado que “funciona bem”** se algo der errado em mudanças futuras.

## 1. Fonte de verdade: Git

A forma mais rápida de rollback é **código = commit/tag no Git**.

### 1.1 Congelar o estado atual (faça antes de grandes mudanças)

No diretório do repositório:

```bash
git status   # garantir que está tudo commitado ou stash do que for temporário
git pull     # alinhar com remoto se usar
git tag -a v-estavel-contratos-YYYYMMDD -m "Versão estável antes de evoluções profissionais (partes, multi-sign, etc.)"
git push origin v-estavel-contratos-YYYYMMDD
```

Substitua `YYYYMMDD` pela data. Esse tag marca **exatamente** o snapshot atual.

### 1.2 Trabalhar em branch (recomendado)

```bash
git checkout -b feature/contratos-profissional
# ... commits ...
```

- **`main`** (ou branch de produção) permanece estável até você **mergear** com confiança.
- Se a feature der problema: **não mergear**; ou **reverter** o merge (ver abaixo).

### 1.3 Voltar o código ao tag/commit estável

**Opção A — deploy apontando para o tag (CI/Vercel):** redeploy do commit associado ao tag `v-estavel-contratos-*`.

**Opção B — branch local/checkout:**

```bash
git fetch origin
git checkout v-estavel-contratos-YYYYMMDD
# ou: git checkout <hash-do-commit>
```

**Opção C — reverter commits já mergeados em main (sem reescrever histórico):**

```bash
git revert -m 1 <hash-do-merge-commit>
```

Use quando o merge já foi para `main` e você quer desfazer de forma auditável.

---

## 2. Banco (Supabase): migrações são “para frente”

O código antigo **pode** rodar com tabelas/colunas **a mais** (geralmente ignora o que não usa). Porém:

- **Remover** tabelas enquanto uma versão nova ainda as usa quebra essa versão.
- **Rollback de app** para commit antigo + **banco com migrações novas** costuma ser **compatível** se a versão antiga não depende das novas colunas com NOT NULL sem default, etc.

### 2.1 O que já existe (referência para rollback manual do BD)

| Artefato | Migração / schema |
|----------|-------------------|
| Convites + OTP + hash referência | `20260326120000_contratos_assinatura_convites_seguranca.sql` (e anteriores de convites) |
| Auditoria Fase 1 | `20260327100000_contrato_eventos_auditoria.sql` |

**Rollback agressivo do BD** (só se você **não** for mais usar essas funcionalidades e tiver certeza):

- Dropar tabela `contrato_eventos_auditoria` (perde histórico de eventos).
- Reverter colunas de `contratos_assinatura_convites` exige script inverso cuidadoso (backup antes).

**Recomendação:** em produção, prefira **backup do Postgres** antes de migrações grandes (Supabase: backups automáticos conforme plano; ou `pg_dump`).

### 2.2 Versão antiga do app + banco novo

Na maioria dos casos: **faça rollback só do deploy (Git)** e **mantenha** as migrações aplicadas, desde que a versão antiga não quebre ao ler/escrever contratos. Se aparecer erro de coluna obrigatória, aí sim trate com migração corretiva ou alinhar versão do app.

---

## 3. Variáveis de ambiente (sem redeploy)

- **`RESEND_MOCK=true`** — desliga envio real pelo Resend; útil em dev. Em produção estável deve estar **desligado** (ou ausente) quando o domínio estiver verificado.
- Não há hoje feature flag global para “desligar auditoria de eventos”: o insert falha silenciosamente no serviço; se a tabela não existir, só loga erro. Para rollout conservador, aplique migração **depois** de validar código em staging.

---

## 4. Checklist antes de “continuar” com melhorias profissionais

- [ ] Commit limpo na branch estável.
- [ ] Tag `v-estavel-contratos-*` criado e enviado ao remoto.
- [ ] Branch de feature criada a partir desse ponto.
- [ ] (Produção) Backup ou confirmação de backup do Supabase.
- [ ] Documentar no PR quais migrações novas entram.

---

## 5. Resumo

| Cenário | Ação principal |
|---------|----------------|
| Código novo com bug | Redeploy do **tag/commit** estável ou `git revert` do merge. |
| BD incompatível | Restaurar backup ou migração corretiva pontual (avaliar caso a caso). |
| Só quer “congelar” estado | **Tag no Git** + branch de feature. |

Assim você mantém a **versão atual que funciona bem** endereçável para sempre (`git tag`), e as evoluções ficam **profissionais** sem perder o plano de retorno.
