// pdf-parse is a CommonJS module, import using createRequire
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// pdf-parse exports the function as CommonJS default export
// The module itself IS the function
const pdfParse = require('pdf-parse');

export interface PDFParseResult {
  text: string;
  pages: number;
  info: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
  };
}

/**
 * Extract text content from a PDF buffer
 * @param buffer PDF file as Buffer
 * @returns Extracted text and metadata
 */
export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  try {
    const data = await pdfParse(buffer);

    return {
      text: data.text,
      pages: data.numpages,
      info: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
      },
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF. The file may be corrupted or encrypted.');
  }
}

/**
 * Extract text from PDF and clean it for AI processing
 * @param buffer PDF file as Buffer
 * @returns Cleaned text suitable for AI processing
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const result = await parsePDF(buffer);

  // Clean up the text:
  // - Remove excessive whitespace
  // - Normalize line breaks
  // - Remove control characters
  const cleanedText = result.text
    .replace(/\r\n/g, '\n')  // Normalize line breaks
    .replace(/\r/g, '\n')    // Normalize line breaks
    .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2
    .replace(/[ \t]{2,}/g, ' ')  // Replace multiple spaces/tabs with single space
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // Remove control characters
    .trim();

  if (!cleanedText || cleanedText.length === 0) {
    throw new Error('No text content found in PDF. The file may be image-based or empty.');
  }

  return cleanedText;
}
