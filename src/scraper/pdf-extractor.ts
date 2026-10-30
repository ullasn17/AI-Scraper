import { PDFParse } from 'pdf-parse';

export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text ? result.text.replace(/\s+/g, ' ').trim() : '';
    const numPages = result.total || 1;
    await parser.destroy();

    return { text, numPages };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`PDF text extraction failed: ${msg}`);
  }
}
