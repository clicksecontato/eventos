export interface PdfEnginePort {
  generatePdfBuffer(htmlCompleto: string): Promise<Buffer>;
}
