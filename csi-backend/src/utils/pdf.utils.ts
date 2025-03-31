import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function compressPDF(inputPath: string, outputPath: string): Promise<void> {
  const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;

  try {
    await execAsync(gsCommand);
    console.log(`✅ PDF compressé avec Ghostscript : ${outputPath}`);
  } catch (err) {
    console.error("❌ Erreur de compression Ghostscript :", err);
    throw err;
  }
}