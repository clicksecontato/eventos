import { s3Service } from '@/lib/s3-service';
import { Contrato } from '@/types';
import { PdfEnginePort } from '@/lib/integrations/pdf/pdf-engine-port';

/** URL base usada na geração do PDF (links, referências no HTML do contrato). */
const PDF_BASE_URL = 'https://controle-de-eventos.vercel.app';

/** Substitui clicksehub.com por PDF_BASE_URL no HTML do contrato. */
function normalizarUrlsNoHtml(html: string): string {
  return html.replace(
    /https:\/\/clicksehub\.com/gi,
    PDF_BASE_URL
  );
}

export class PDFService {
  private static pdfEngine?: PdfEnginePort;

  static setPdfEngine(pdfEngine: PdfEnginePort): void {
    this.pdfEngine = pdfEngine;
  }

  static async gerarPDFContrato(contrato: Contrato, html: string): Promise<{ url: string; path: string }> {
    try {
      const pdfBuffer = await this.gerarPDF(html);
      const fileName = `contratos/${contrato.userId}/${contrato.id}.pdf`;

      const uploadResult = await s3Service.uploadBuffer(pdfBuffer, fileName, 'application/pdf');

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error('Erro ao fazer upload do PDF');
      }

      return {
        url: uploadResult.url,
        path: fileName
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao gerar PDF:', error);
      throw new Error(`Erro ao gerar PDF: ${msg}`);
    }
  }

  static async gerarPDF(html: string): Promise<Buffer> {
    if (!html?.trim()) {
      throw new Error('HTML não pode estar vazio');
    }

    const htmlNormalizado = normalizarUrlsNoHtml(html);

    const htmlCompleto = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <base href="${PDF_BASE_URL}/">
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      color: #333;
      white-space: pre-wrap;
    }
    h1 {
      font-size: 2em;
      font-weight: bold;
      margin-top: 1em;
      margin-bottom: 0.5em;
    }
    h2 {
      font-size: 1.5em;
      font-weight: bold;
      margin-top: 1em;
      margin-bottom: 0.5em;
    }
    h3 {
      font-size: 1.25em;
      font-weight: bold;
      margin-top: 1em;
      margin-bottom: 0.5em;
    }
    p {
      margin: 0.5em 0;
    }
    ul, ol {
      padding-left: 1.5em;
      margin: 0.5em 0;
    }
    li {
      margin: 0.25em 0;
    }
    hr {
      margin: 1em 0;
      border: none;
      border-top: 1px solid #ccc;
    }
  </style>
</head>
<body>
  ${htmlNormalizado}
</body>
</html>`;

    try {
      if (!this.pdfEngine) {
        throw new Error('PDF engine não configurado. Inicialize via ServiceFactory.');
      }
      return await this.pdfEngine.generatePdfBuffer(htmlCompleto);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao gerar PDF:', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      throw new Error(`Erro ao gerar PDF: ${msg}`);
    }
  }
}
