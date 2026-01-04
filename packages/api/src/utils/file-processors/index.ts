/**
 * File Processor Factory
 *
 * Provides a unified interface for processing different file types.
 * Supports PDFs, Word documents, spreadsheets, and text files.
 */

/**
 * Processed file result interface
 */
export interface ProcessedFile {
  type: 'text' | 'structured';
  content: string; // Text content for AI processing
  structuredData?: any; // For spreadsheets (optional)
  metadata: {
    mimeType: string;
    fileSize: number;
    pages?: number;
    rows?: number;
  };
}

/**
 * File processor interface
 * Each processor handles specific MIME types
 */
export interface IFileProcessor {
  /**
   * MIME types supported by this processor
   */
  supportedMimeTypes: string[];

  /**
   * Maximum file size in bytes
   */
  maxFileSize: number;

  /**
   * Check if this processor can handle the given MIME type
   */
  canProcess(mimeType: string): boolean;

  /**
   * Process the file buffer and extract content
   */
  process(buffer: Buffer, mimeType: string): Promise<ProcessedFile>;
}

/**
 * File Processor Factory
 * Manages all file processors and routes files to the appropriate handler
 */
export class FileProcessorFactory {
  private static processors: IFileProcessor[] = [];

  /**
   * Register a file processor
   */
  static register(processor: IFileProcessor): void {
    this.processors.push(processor);
  }

  /**
   * Get the appropriate processor for a MIME type
   */
  static getProcessor(mimeType: string): IFileProcessor | null {
    return this.processors.find(p => p.canProcess(mimeType)) || null;
  }

  /**
   * Validate file size against processor limits
   */
  static validateFileSize(mimeType: string, size: number): boolean {
    const processor = this.getProcessor(mimeType);
    return processor ? size <= processor.maxFileSize : false;
  }

  /**
   * Get all supported MIME types
   */
  static getSupportedMimeTypes(): string[] {
    return this.processors.flatMap(p => p.supportedMimeTypes);
  }

  /**
   * Get max file size for a MIME type in bytes
   */
  static getMaxFileSize(mimeType: string): number | null {
    const processor = this.getProcessor(mimeType);
    return processor ? processor.maxFileSize : null;
  }
}

/**
 * File size limits (in MB)
 */
export const FILE_SIZE_LIMITS = {
  PDF: 10,
  WORD: 5,
  SPREADSHEET: 10,
  TEXT: 2,
} as const;
