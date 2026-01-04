import * as XLSX from 'xlsx';
import { IFileProcessor, ProcessedFile, FILE_SIZE_LIMITS } from './index';

/**
 * Spreadsheet Processor
 * Handles Excel and CSV files using SheetJS (xlsx library)
 */
export class SpreadsheetProcessor implements IFileProcessor {
  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/csv', // .csv
    'application/vnd.ms-excel', // .xls (legacy)
  ];
  maxFileSize = FILE_SIZE_LIMITS.SPREADSHEET * 1024 * 1024; // 10MB

  canProcess(mimeType: string): boolean {
    return this.supportedMimeTypes.includes(mimeType);
  }

  async process(buffer: Buffer, mimeType: string): Promise<ProcessedFile> {
    try {
      // Read workbook from buffer
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: true, // Parse dates
        cellNF: false, // Don't include number formats
        cellHTML: false, // Don't include HTML
      });

      // Check if workbook has sheets
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in spreadsheet. The file may be empty or corrupted.');
      }

      // Convert all sheets to text for AI processing
      let textContent = '';
      const structuredData: any[] = [];

      workbook.SheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName];

        // Skip if sheet doesn't exist
        if (!sheet) {
          console.warn(`[SpreadsheetProcessor] Sheet "${sheetName}" is undefined, skipping`);
          return;
        }

        // Convert sheet to CSV format for text content
        const csv = XLSX.utils.sheet_to_csv(sheet, {
          blankrows: false, // Skip blank rows
          strip: true, // Strip whitespace
        });

        // Add sheet to text content with header
        if (csv && csv.trim().length > 0) {
          textContent += `\n=== Sheet: ${sheetName} ===\n${csv}\n`;

          // Extract structured data from first sheet only
          if (index === 0) {
            const json = XLSX.utils.sheet_to_json(sheet, {
              defval: '', // Default value for empty cells
              blankrows: false,
            });
            structuredData.push(...json);
          }
        }
      });

      // Validate content exists
      if (!textContent || textContent.trim().length === 0) {
        throw new Error('No data found in spreadsheet. All sheets appear to be empty.');
      }

      // Clean up text content
      const cleanedText = textContent.trim();

      // Calculate total rows
      const totalRows = cleanedText.split('\n').length;

      // If file is too large (>10k rows), sample first 5000 rows
      let finalText = cleanedText;
      if (totalRows > 10000) {
        const lines = cleanedText.split('\n');
        finalText = lines.slice(0, 5000).join('\n');
        finalText += `\n\n[... ${totalRows - 5000} more rows truncated for processing ...]`;
        console.warn(`[SpreadsheetProcessor] Large file detected (${totalRows} rows). Sampled first 5000 rows.`);
      }

      return {
        type: 'structured',
        content: finalText,
        structuredData: structuredData.length > 0 ? structuredData : undefined,
        metadata: {
          mimeType,
          fileSize: buffer.length,
          rows: totalRows,
        },
      };
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        // Password-protected file
        if (error.message.includes('password') || error.message.includes('encrypted')) {
          throw new Error('Spreadsheet appears to be password-protected. Please remove protection and try again.');
        }

        // Corruption error
        if (error.message.includes('corrupt') || error.message.includes('ZIP')) {
          throw new Error('Spreadsheet appears to be corrupted. Try opening in Excel and re-saving.');
        }

        // Legacy format
        if (mimeType === 'application/vnd.ms-excel') {
          throw new Error(`Excel .xls format has limited support: ${error.message}. Please save as .xlsx and try again.`);
        }

        throw new Error(`Spreadsheet processing failed: ${error.message}`);
      }

      throw new Error('Spreadsheet processing failed: Unknown error');
    }
  }
}
