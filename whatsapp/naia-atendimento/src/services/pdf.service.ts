import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

export class PDFService {
  private static cachedText: string | null = null;
  private static lastLoadedTime: number = 0;

  /**
   * Reads all PDF files found in the /data directory,
   * extracts their text and caches them in memory.
   */
  static async getPDFContent(): Promise<string> {
    const dataDir = path.join(process.cwd(), "data");
    
    try {
      if (!fs.existsSync(dataDir)) {
        return "";
      }

      const files = fs.readdirSync(dataDir);
      const pdfFiles = files.filter((f) => f.toLowerCase().endsWith(".pdf"));
      
      if (pdfFiles.length === 0) {
        return "";
      }

      // Generate a cache key based on the modification times of all PDF files
      let totalMtime = 0;
      for (const file of pdfFiles) {
        const stats = fs.statSync(path.join(dataDir, file));
        totalMtime += stats.mtimeMs;
      }

      // If cached and files have not changed, return cache
      if (this.cachedText !== null && totalMtime <= this.lastLoadedTime) {
        return this.cachedText;
      }

      console.log(`📖 Extracting text from ${pdfFiles.length} PDF(s)...`);
      let combinedText = "";
      for (const file of pdfFiles) {
        const targetPath = path.join(dataDir, file);
        console.log(`📄 Parsing PDF: ${file}`);
        const dataBuffer = fs.readFileSync(targetPath);
        
        // pdf-parse expects a Buffer
        const parsed = await pdf(dataBuffer);
        
        combinedText += `\n\n--- INÍCIO DO ARQUIVO DE CONTEXTO: ${file} ---\n${parsed.text}\n--- FIM DO ARQUIVO DE CONTEXTO: ${file} ---\n`;
      }
      
      this.cachedText = combinedText;
      this.lastLoadedTime = totalMtime;
      console.log(`✅ Extracted text from all ${pdfFiles.length} PDF(s) successfully.`);
      
      return this.cachedText;
    } catch (error) {
      console.error("❌ Error reading or parsing PDF files:", error);
      return "";
    }
  }
}
