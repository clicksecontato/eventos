import 'server-only';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export { calcularSha256Hex, bufferEhPngValido } from '@/lib/services/pdf-assinatura-utils';

const LARGURA_PAGINA_A4 = 595.28;
const ALTURA_PAGINA_A4 = 841.89;
const LARGURA_MAX_ASSINATURA_PT = 240;

function quebrarTexto(linha: string, tamanhoMaximo: number): string[] {
  const partes: string[] = [];
  for (let i = 0; i < linha.length; i += tamanhoMaximo) {
    partes.push(linha.slice(i, i + tamanhoMaximo));
  }
  return partes.length > 0 ? partes : [''];
}

export interface IncorporarAssinaturaParametros {
  pdfBuffer: Buffer;
  imagemPngBuffer: Buffer;
  nomeSignatario: string;
  emailSignatario?: string;
  hashPdfAntesAssinatura: string;
  linhasAuditoria: string[];
}

/**
 * Acrescenta página de assinatura com imagem PNG e metadados de auditoria ao PDF existente.
 */
export async function incorporarAssinaturaNoPdf(
  params: IncorporarAssinaturaParametros
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(params.pdfBuffer, { ignoreEncryption: true });
  const png = await pdfDoc.embedPng(params.imagemPngBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([LARGURA_PAGINA_A4, ALTURA_PAGINA_A4]);
  const { height } = page.getSize();

  let y = height - 48;
  const margem = 48;

  page.drawText('Assinatura eletrônica avançada (Lei nº 14.063/2020)', {
    x: margem,
    y,
    size: 13,
    font,
    color: rgb(0.08, 0.08, 0.1),
  });
  y -= 18;

  page.drawText('Não constitui assinatura qualificada ICP-Brasil / certificado digital.', {
    x: margem,
    y,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.38),
  });
  y -= 22;

  page.drawText(`Signatário: ${params.nomeSignatario}`, {
    x: margem,
    y,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.12),
  });
  y -= 18;

  if (params.emailSignatario?.trim()) {
    page.drawText(`E-mail: ${params.emailSignatario.trim()}`, {
      x: margem,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.22),
    });
    y -= 16;
  }

  const escala = LARGURA_MAX_ASSINATURA_PT / png.width;
  const larguraImg = LARGURA_MAX_ASSINATURA_PT;
  const alturaImg = png.height * escala;
  y -= alturaImg + 14;

  page.drawImage(png, {
    x: margem,
    y,
    width: larguraImg,
    height: alturaImg,
  });

  y -= 20;
  page.drawText('SHA-256 do PDF antes desta página (documento exibido para assinatura):', {
    x: margem,
    y,
    size: 9,
    font,
    color: rgb(0.25, 0.25, 0.28),
  });
  y -= 14;

  for (const trecho of quebrarTexto(params.hashPdfAntesAssinatura, 86)) {
    page.drawText(trecho, {
      x: margem,
      y,
      size: 8,
      font,
      color: rgb(0.15, 0.15, 0.18),
    });
    y -= 11;
  }

  y -= 6;
  for (const linha of params.linhasAuditoria) {
    if (!linha.trim()) continue;
    page.drawText(linha, {
      x: margem,
      y,
      size: 9,
      font,
      maxWidth: LARGURA_PAGINA_A4 - margem * 2,
      color: rgb(0.2, 0.2, 0.24),
    });
    y -= 14;
    if (y < 72) break;
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
