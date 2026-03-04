import { PdfEnginePort } from './pdf-engine-port';

type PdfMargins = { top: string; right: string; bottom: string; left: string };

interface PdfPagePort {
  setDefaultTimeout(timeout: number): void;
  setContent(html: string, options: { waitUntil: 'networkidle0'; timeout: number }): Promise<void>;
  pdf(options: {
    format: 'A4';
    margin: PdfMargins;
    printBackground: boolean;
    timeout: number;
  }): Promise<Uint8Array | Buffer>;
}

interface BrowserPort {
  newPage(): Promise<PdfPagePort>;
  close(): Promise<void>;
}

interface PuppeteerModulePort {
  launch(options: Record<string, unknown>): Promise<BrowserPort>;
  defaultArgs?(options: { args: string[]; headless: 'shell' }): string[];
}

interface ChromiumModulePort {
  args: string[];
  defaultViewport: Record<string, unknown>;
  executablePath(): Promise<string>;
  setGraphicsMode?: boolean;
}

function isServerless(): boolean {
  return process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

export class PuppeteerPdfEngineAdapter implements PdfEnginePort {
  async generatePdfBuffer(htmlCompleto: string): Promise<Buffer> {
    const useChromium = isServerless();
    let puppeteer: PuppeteerModulePort;
    let launchOptions: Record<string, unknown>;

    if (useChromium) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        puppeteer = require('puppeteer-core') as PuppeteerModulePort;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const chromium = require('@sparticuz/chromium') as ChromiumModulePort;

        chromium.setGraphicsMode = false;
        const executablePath = await chromium.executablePath();
        const defaultArgs = typeof puppeteer.defaultArgs === 'function'
          ? puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' })
          : chromium.args;

        launchOptions = {
          args: defaultArgs,
          defaultViewport: chromium.defaultViewport,
          executablePath,
          headless: 'shell',
          timeout: 60_000
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Em ambiente serverless (Vercel/Lambda) é necessário @sparticuz/chromium. Detalhes: ${msg}`
        );
      }
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        puppeteer = require('puppeteer') as PuppeteerModulePort;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Puppeteer não está instalado. Execute: npx puppeteer browsers install chrome. Detalhes: ${msg}`);
      }

      launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        timeout: 60_000
      };
    }

    let browser: BrowserPort | undefined;
    try {
      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      page.setDefaultTimeout(30_000);

      await page.setContent(htmlCompleto, {
        waitUntil: 'networkidle0',
        timeout: 30_000
      });

      const pdfData = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
        timeout: 30_000
      });

      await browser.close();
      browser = undefined;

      const buffer = Buffer.isBuffer(pdfData) ? pdfData : Buffer.from(pdfData);
      if (!buffer.length) {
        throw new Error('PDF gerado está vazio');
      }
      return buffer;
    } catch (error) {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignorar erro de fechamento para não mascarar erro principal.
        }
      }
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao gerar PDF: ${msg}`);
    }
  }
}
