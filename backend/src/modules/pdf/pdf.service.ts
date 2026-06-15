import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

@Injectable()
export class PdfService {
  private cachedText: string | null = null;
  private lastLoadedTime = 0;

  async getPDFContent(): Promise<string> {
    const dataDir = path.join(process.cwd(), 'data');

    try {
      if (!fs.existsSync(dataDir)) return '';

      const files = fs.readdirSync(dataDir);
      const pdfFiles = files.filter((f) => f.toLowerCase().endsWith('.pdf'));

      if (pdfFiles.length === 0) return '';

      let totalMtime = 0;
      for (const file of pdfFiles) {
        const stats = fs.statSync(path.join(dataDir, file));
        totalMtime += stats.mtimeMs;
      }

      if (this.cachedText !== null && totalMtime <= this.lastLoadedTime) {
        return this.cachedText;
      }

      console.log(`📖 Extracting text from ${pdfFiles.length} PDF(s)...`);
      let combinedText = '';
      for (const file of pdfFiles) {
        const buffer = fs.readFileSync(path.join(dataDir, file));
        const parsed = await pdf(buffer);
        combinedText += `\n\n--- INÍCIO DO ARQUIVO DE CONTEXTO: ${file} ---\n${parsed.text}\n--- FIM DO ARQUIVO DE CONTEXTO: ${file} ---\n`;
      }

      this.cachedText = combinedText;
      this.lastLoadedTime = totalMtime;
      console.log(`✅ Extracted text from ${pdfFiles.length} PDF(s).`);

      return this.cachedText;
    } catch (error) {
      console.error('❌ Error reading or parsing PDF files:', error);
      return '';
    }
  }
}
