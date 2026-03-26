# Implementação — assinatura interna no PDF

## Resumo

Fluxo completo: usuário com contrato em status **gerado** e `pdf_path` preenchido abre o modal **Assinar PDF**, desenha no canvas, e o servidor baixa o PDF do S3, incorpora uma nova página A4 com imagem PNG + metadados + hash SHA-256 do PDF anterior, envia o arquivo final para `contratos/{userId}/{id}-assinado.pdf` e atualiza o registro (status **assinado**, auditoria em JSONB).

## Arquivos criados

| Arquivo | Função |
|---------|--------|
| `supabase/migrations/20260325120000_contratos_assinatura_interna.sql` | Adiciona `pdf_path_original` e `assinatura_auditoria` em `contratos`. |
| `src/lib/services/pdf-assinatura-utils.ts` | `calcularSha256Hex`, `bufferEhPngValido` (sem `server-only`, testável no Vitest). |
| `src/lib/services/pdf-assinatura-service.ts` | `incorporarAssinaturaNoPdf` com `pdf-lib`: nova página, texto e imagem. |
| `src/lib/services/pdf-assinatura-service.test.ts` | Testes unitários dos utilitários de hash/PNG. |
| `src/app/api/contratos/[id]/assinar-pdf/route.ts` | `POST`: valida PNG, baixa PDF, assina, upload, atualiza contrato. |
| `src/components/contratos/AssinaturaContratoDialog.tsx` | Modal com canvas (mouse + touch), envio para a API, abre PDF assinado. |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `package.json` | Dependência `pdf-lib`. |
| `supabase/schema.sql` | `ALTER TABLE contratos` para as novas colunas (fonte de verdade junto à migration). |
| `src/types/index.ts` | `AssinaturaAuditoriaContrato`, `pdfPathOriginal`, `assinaturaAuditoria` em `Contrato`. |
| `src/lib/repositories/supabase/contrato-supabase-repository.ts` | Mapeamento Supabase ↔ tipo. |
| `src/lib/s3-service.ts` | `downloadBuffer(s3Key)` para ler o PDF antes de processar. |
| `src/app/contratos/[id]/page.tsx` | Botão **Assinar PDF** (status gerado), dialog, exibição de data/hash quando assinado. |
| `src/app/api/assinaturas/route.test.ts` | `mockReturnValue(null)` em vez de `undefined` (compatível com `Error \| null` do TypeScript). |

## Pós-deploy / local

1. Rodar a migration no Supabase (ou aplicar o SQL da migration manualmente).
2. `npm install` (já inclui `pdf-lib`).

## Validação

- `npx tsc --noEmit`
- `npm run test -- --run src/lib/services/pdf-assinatura-service.test.ts`

## Manutenção e escala

- **Um arquivo por contrato assinado:** `...-assinado.pdf`; o caminho anterior fica em `pdf_path_original` na primeira assinatura.
- **Re-assinatura:** bloqueada (409) se `status === 'assinado'`.
- **Limite de PNG:** 500 KB no servidor; tamanho mínimo para evitar canvas em branco.
- **Próximos passos possíveis:** OTP para nível “avançado”; link público para cliente assinar sem login; posição configurável da assinatura no template.
