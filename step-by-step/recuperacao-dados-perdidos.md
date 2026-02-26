# Recuperação de Dados Perdidos - Supabase

## 🚨 Situação
Todos os dados da base de dados foram perdidos após execução do schema SQL.

## 🔍 Análise

O schema `supabase/schema.sql` **NÃO contém comandos que apagam dados**:
- ✅ Apenas `CREATE TABLE IF NOT EXISTS` (não apaga dados existentes)
- ✅ Apenas `CREATE INDEX IF NOT EXISTS` (não apaga dados)
- ✅ Apenas `DROP TRIGGER IF EXISTS` seguido de `CREATE TRIGGER` (não apaga dados)

**Possíveis causas:**
1. Execução em um projeto Supabase novo/vazio
2. Reset do projeto Supabase
3. Execução manual de algum comando DELETE/TRUNCATE
4. Problema na interface do Supabase durante execução

## 🆘 OPÇÕES DE RECUPERAÇÃO

### Opção 1: Restaurar Backup Automático do Supabase (RECOMENDADO) ⭐

O Supabase faz **backups automáticos diários** por 7 dias (planos gratuitos) ou 30 dias (planos pagos).

#### Como restaurar:

1. **Acesse o Supabase Dashboard:**
   - https://app.supabase.com
   - Selecione seu projeto

2. **Vá em Database → Backups:**
   - Menu lateral → **Database**
   - Aba **Backups**

3. **Selecione o backup mais recente:**
   - Veja lista de backups disponíveis
   - Escolha o backup **ANTES** da execução do schema
   - Clique em **Restore** ou **Restore to new database**

4. **Confirme a restauração:**
   - ⚠️ Isso pode substituir os dados atuais
   - Verifique se selecionou o backup correto

#### Limitações:
- Backups automáticos: Últimos 7 dias (plano gratuito) ou 30 dias (planos pagos)
- Se passou mais tempo, pode não haver backup disponível

---

### Opção 2: Restaurar do Firebase (Se ainda tiver dados lá)

Se você ainda tem dados no Firebase/Firestore, pode re-migrar:

1. **Verificar dados no Firebase:**
   - Acesse Firebase Console
   - Verifique se os dados ainda estão lá

2. **Re-executar migração:**
   - Use o script `supabase/migrate-firebase-to-supabase.ts`
   - Ele faz upsert (não duplica dados)

---

### Opção 3: Verificar Point-in-Time Recovery (PITR)

Se tiver plano pago do Supabase:
- Pode restaurar para qualquer ponto no tempo (até 7 dias)
- Vá em **Database → Backups → Point-in-Time Recovery**

---

## 🔒 PREVENÇÃO PARA O FUTURO

### 1. Sempre fazer backup antes de executar scripts SQL:
```sql
-- Exportar dados antes de modificações
-- Via Supabase Dashboard → Database → Export
```

### 2. Testar scripts em ambiente de desenvolvimento primeiro

### 3. Usar transações para scripts grandes:
```sql
BEGIN;
-- seus comandos aqui
COMMIT; -- ou ROLLBACK em caso de erro
```

### 4. Verificar o que vai ser executado:
- Ler o script completo antes de executar
- Verificar se há DROP TABLE, TRUNCATE, DELETE FROM

---

## 📝 VERIFICAÇÃO DO SCHEMA ATUAL

O arquivo `supabase/schema.sql` foi verificado e **NÃO contém**:
- ❌ `DROP TABLE`
- ❌ `TRUNCATE`
- ❌ `DELETE FROM`

Apenas contém:
- ✅ `CREATE TABLE IF NOT EXISTS` (seguro)
- ✅ `CREATE INDEX IF NOT EXISTS` (seguro)
- ✅ `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` (seguro)

---

## ⚡ PRÓXIMOS PASSOS

1. **IMEDIATO**: Verificar backups no Supabase Dashboard
2. **Se houver backup**: Restaurar o mais recente antes do problema
3. **Se não houver backup no Supabase**: Verificar se Firebase ainda tem dados
4. **Se Firebase tiver dados**: Re-executar migração

---

## 💡 CONTATO SUPABASE (Se necessário)

Se os backups não estiverem disponíveis:
- Abra um ticket no Supabase Support
- Explique a situação
- Eles podem ter backups adicionais
