import mammoth from 'mammoth';
import { IFileProcessor, ProcessedFile, FILE_SIZE_LIMITS } from './index';

/**
 * Word Document Processor
 * Handles Microsoft Word documents (.docx, .doc) using mammoth library
 */
export class WordProcessor implements IFileProcessor {
  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc (limited support)
  ];
  maxFileSize = FILE_SIZE_LIMITS.WORD * 1024 * 1024; // 5MB

  canProcess(mimeType: string): boolean {
    return this.supportedMimeTypes.includes(mimeType);
  }

  async process(buffer: Buffer, mimeType: string): Promise<ProcessedFile> {
    try {
      // Extract raw text from Word document
      const result = await mammoth.extractRawText({ buffer });

      // Check if extraction was successful
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text content found in document. The file may be empty or contain only images.');
      }

      // Check for password protection or corruption
      if (result.messages && result.messages.length > 0) {
        const hasErrors = result.messages.some(msg => msg.type === 'error');
        if (hasErrors) {
          console.warn('[WordProcessor] Extraction warnings:', result.messages);
        }
      }

      // Clean up extracted text
      const cleanedText = result.value
        .replace(/\r\n/g, '\n') // Normalize line breaks
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
        .trim();

      return {
        type: 'text',
        content: cleanedText,
        metadata: {
          mimeType,
          fileSize: buffer.length,
        },
      };
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        // Password-protected document
        if (error.message.includes('password') || error.message.includes('encrypted')) {
          throw new Error('Document appears to be password-protected. Please remove protection and try again.');
        }

        // Corruption error
        if (error.message.includes('corrupt') || error.message.includes('invalid')) {
          throw new Error('Document appears to be corrupted. Try opening in Microsoft Word and re-saving.');
        }

        // .doc format (older) - limited support
        if (mimeType === 'application/msword') {
          throw new Error(`Word .doc format has limited support: ${error.message}. Please save as .docx and try again.`);
        }

        throw new Error(`Word document processing failed: ${error.message}`);
      }

      throw new Error('Word document processing failed: Unknown error');
    }
  }
}
