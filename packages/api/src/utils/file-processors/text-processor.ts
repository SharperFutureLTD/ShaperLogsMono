import { IFileProcessor, ProcessedFile, FILE_SIZE_LIMITS } from './index';

/**
 * Text File Processor
 * Handles plain text and markdown files
 */
export class TextProcessor implements IFileProcessor {
  supportedMimeTypes = ['text/plain', 'text/markdown'];
  maxFileSize = FILE_SIZE_LIMITS.TEXT * 1024 * 1024; // 2MB

  canProcess(mimeType: string): boolean {
    return this.supportedMimeTypes.includes(mimeType);
  }

  async process(buffer: Buffer, mimeType: string): Promise<ProcessedFile> {
    try {
      // Decode as UTF-8
      const text = buffer.toString('utf-8');

      // Validate content exists
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in file. The file appears to be empty.');
      }

      // Clean up text
      const cleanedText = text
        .replace(/\r\n/g, '\n') // Normalize line breaks
        .replace(/\r/g, '\n')
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
      // Check for encoding errors
      if (error instanceof Error) {
        if (error.message.includes('Invalid')) {
          throw new Error('File encoding not supported. Please save as UTF-8.');
        }
        throw new Error(`Text processing failed: ${error.message}`);
      }
      throw new Error('Text processing failed: Unknown error');
    }
  }
}
