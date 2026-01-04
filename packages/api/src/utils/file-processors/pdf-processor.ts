import { IFileProcessor, ProcessedFile, FILE_SIZE_LIMITS } from './index';
import { extractTextFromPDF } from '../pdf-parser';

/**
 * PDF File Processor
 * Handles PDF document text extraction using pdf-parse library
 */
export class PdfProcessor implements IFileProcessor {
  supportedMimeTypes = ['application/pdf'];
  maxFileSize = FILE_SIZE_LIMITS.PDF * 1024 * 1024; // 10MB

  canProcess(mimeType: string): boolean {
    return this.supportedMimeTypes.includes(mimeType);
  }

  async process(buffer: Buffer, mimeType: string): Promise<ProcessedFile> {
    try {
      // Extract text from PDF
      const text = await extractTextFromPDF(buffer);

      // Validate content exists
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in PDF. The file may be image-based or empty.');
      }

      return {
        type: 'text',
        content: text,
        metadata: {
          mimeType,
          fileSize: buffer.length,
        },
      };
    } catch (error) {
      // Re-throw with context
      if (error instanceof Error) {
        throw new Error(`PDF processing failed: ${error.message}`);
      }
      throw new Error('PDF processing failed: Unknown error');
    }
  }
}
