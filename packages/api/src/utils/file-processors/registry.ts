/**
 * File Processor Registry
 * Registers all available file processors with the factory
 */

import { FileProcessorFactory } from './index';
import { PdfProcessor } from './pdf-processor';
import { TextProcessor } from './text-processor';
import { WordProcessor } from './word-processor';
import { SpreadsheetProcessor } from './spreadsheet-processor';

/**
 * Initialize all file processors
 * Call this once during application startup
 */
export function initializeFileProcessors(): void {
  // Register processors
  FileProcessorFactory.register(new PdfProcessor());
  FileProcessorFactory.register(new TextProcessor());
  FileProcessorFactory.register(new WordProcessor());
  FileProcessorFactory.register(new SpreadsheetProcessor());

  console.log(`[FileProcessors] Initialized ${FileProcessorFactory.getSupportedMimeTypes().length} MIME types`);
}

// Export for convenience
export { FileProcessorFactory };
