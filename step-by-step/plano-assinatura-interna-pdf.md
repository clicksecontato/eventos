# Plano — assinatura interna “no PDF” (Brasil)

## Objetivo

Permitir que o usuário **desenhe ou carregue** uma assinatura manuscrita e que ela fique **gravada dentro do arquivo PDF**, sem depender de Clicksign/Autentique. Isso corresponde, em geral, a **assinatura eletrônica** (Lei 14.063/2020), **não** a assinatura **qualificada** com certificado ICP-Brasil embutido no PDF (PAdES).

## O que é “assinar o PDF de verdade” na prática

| Abordagem | O que o usuário faz | Resultado no PDF | Observação jurídica-técnica |
|-----------|---------------------|------------------|-----------------------------|
| **A — Recomendada (MVP)** | Desenha na tela (canvas) ou envia imagem PNG | Imagem da assinatura + página de auditoria (texto) embutidas com `pdf-lib` | Simples ou avançada conforme prova (login + OTP, etc.) |
| **B — Qualificada ICP-Brasil** | Usa certificado A1/A3 (navegador/plugin) | Assinatura criptográfica PAdES no PDF | Exige certificado e stack específica; raro para cliente final em SaaS |

Este documento descreve a **abordagem A**, alinhada ao fluxo atual: `PDFService.gerarPDFContrato` → buffer → S3 (`contratos/{userId}/{id}.pdf`).

## Fluxo sugerido (alto nível)

1. Contrato em estado assinável; PDF base já gerado (ou gerado no momento).
2. Tela **Assinar contrato**: pré-visualização do PDF (iframe/`react-pdf` ou link) + **área de assinatura** (`signature_pad` ou canvas nativo).
3. Usuário desenha → front envia **PNG em base64** (ou multipart) para `POST /api/contratos/[id]/assinar-pdf`.
4. **Backend** (sessão validada, `user_id`):
   - Baixa o PDF atual do S3 **ou** regenera a partir do HTML congelado (decisão de produto).
   - Carrega PDF com **`pdf-lib`**, desenha a imagem em coordenadas fixas (última página ou página extra “Folha de assinaturas”).
   - Opcional: acrescenta texto com data, nome, e-mail, hash do documento **antes** da imagem (ou página seguinte).
   - Calcula **SHA-256** do buffer final.
   - Faz upload para novo path, ex.: `contratos/{userId}/{id}-assinado.pdf` (preserva o original se quiser prova de cadeia).
5. Persistência: atualizar `contratos` (`pdfPath`, `pdfUrl`, `status`) + tabela **`assinaturas_contrato`** (ou JSON em coluna) com: `hash`, `assinado_em`, `ip`, `user_agent`, `user_id`, `metodo` (canvas).

## Integração com o código existente

- **Geração atual:** `src/lib/services/pdf-service.ts` — `gerarPDFContrato` gera buffer via Puppeteer e envia ao S3.
- **Rota de referência:** `src/app/api/contratos/[id]/gerar-pdf/route.ts` — padrão de auth e atualização do repositório.
- **Novo módulo sugerido:** `src/lib/services/pdf-assinatura-service.ts` — recebe `Buffer` do PDF + imagem PNG + metadados → retorna `Buffer` assinado visualmente.
- **Novo pacote:** `pdf-lib` (somente servidor; não importar em Client Components).

## Detalhes técnicos importantes

- **Coordenadas:** PDF usa pontos (72 dpi). Posicionar assinatura com `drawImage` em retângulo conhecido; testar com A4.
- **Tamanho da imagem:** limitar largura/altura no servidor para evitar PDF gigante ou DoS.
- **Congelamento do conteúdo:** o hash jurídico deve ser do **mesmo bytes** que o signatário viu; ideal guardar `hash_antes_assinatura` e `hash_depois`.
- **Re-assinatura:** decidir se bloqueia após primeiro “assinado” ou permite versões numeradas.
- **Fortalecer para “avançada”:** OTP por e-mail/SMS antes de aceitar o POST de assinatura.

## Próximos passos de implementação (ordem)

1. Migração Supabase: tabela ou colunas de auditoria + paths `pdf_path_original` / `pdf_path_assinado` (se dual).
2. Instalar `pdf-lib` e implementar `PdfAssinaturaService`.
3. API `POST .../assinar-pdf` + validação Zod do payload (base64, mime, tamanho).
4. UI na página do contrato: componente de canvas + chamada à API.
5. Testes: PDF gerado contém imagem; hash estável para mesmo input; 401 sem sessão.

## Arquivos tocados (previsão)

| Arquivo / pasta | Função |
|-----------------|--------|
| `supabase/schema.sql` ou migration | Nova tabela / colunas |
| `src/lib/services/pdf-assinatura-service.ts` | Merge PNG + PDF com pdf-lib |
| `src/app/api/contratos/[id]/assinar-pdf/route.ts` | Endpoint de assinatura |
| `src/components/contratos/AssinaturaCanvas.tsx` (ex.) | Captura da assinatura no browser |
| `src/app/contratos/[id]/page.tsx` | Botão / modal “Assinar” |
| `src/lib/repositories/...` | Atualizar contrato após assinatura |

---

*Documento de planejamento; implementação pendente conforme prioridade do produto.*
