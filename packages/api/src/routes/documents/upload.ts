// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { createUserClient } from '../../db/client';
import { FileProcessorFactory } from '../../utils/file-processors/registry';

const app = new OpenAPIHono<AuthContext>();

const UploadResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  file_name: z.string(),
  file_path: z.string(),
  document_type: z.string(),
  parsed_content: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

const uploadRoute = createRoute({
  method: 'post',
  path: '/api/documents/upload',
  tags: ['Documents'],
  summary: 'Upload and parse document',
  description: 'Upload a document (PDF, Word, Excel, CSV, or text file), extract text content, and store it in the database. The file is uploaded to Supabase Storage and the text content is parsed and stored for AI processing.',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.instanceof(File),
            documentType: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Document uploaded and parsed successfully',
      content: {
        'application/json': {
          schema: UploadResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request - invalid file or missing data',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - missing or invalid JWT',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
  middleware: [authMiddleware] as const,
});

app.openapi(uploadRoute, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'User not authenticated' }, 401);
    }

    // Get form data
    const body = await c.req.parseBody();
    const file = body.file;
    const documentType = (body.documentType as string) || 'targets';

    if (!file || !(file instanceof File)) {
      return c.json({
        error: 'Bad Request',
        message: 'No file provided or invalid file type'
      }, 400);
    }

    // Get appropriate file processor
    const processor = FileProcessorFactory.getProcessor(file.type);
    if (!processor) {
      const supportedTypes = FileProcessorFactory.getSupportedMimeTypes();
      return c.json({
        error: 'Unsupported File Type',
        message: `File type "${file.type}" is not supported. Allowed types: PDF, Word (.docx, .doc), Excel (.xlsx, .xls), CSV, Text (.txt, .md).`,
        supportedMimeTypes: supportedTypes
      }, 400);
    }

    // Validate file size
    if (file.size > processor.maxFileSize) {
      const limitMB = (processor.maxFileSize / (1024 * 1024)).toFixed(1);
      return c.json({
        error: 'File Too Large',
        message: `File exceeds ${limitMB}MB size limit for ${file.type} files.`
      }, 400);
    }

    // Convert File to Buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process file and extract content
    let parsedContent: string;
    try {
      const processed = await processor.process(buffer, file.type);
      parsedContent = processed.content;
    } catch (processingError) {
      console.error('File processing error:', processingError);
      return c.json({
        error: 'File Processing Error',
        message: processingError instanceof Error ? processingError.message : 'Failed to process file'
      }, 400);
    }

    // Get user-scoped Supabase client
    const token = c.get('token');
    const supabase = createUserClient(token);

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'pdf';
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('target-documents')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return c.json({
        error: 'Upload Error',
        message: uploadError.message
      }, 500);
    }

    // Insert document record with parsed content and metadata
    const { data: document, error: insertError} = await supabase
      .from('target_documents')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: uploadData.path,
        document_type: documentType,
        parsed_content: parsedContent,
        file_size: file.size, // NEW: Track file size
        mime_type: file.type, // NEW: Track MIME type
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Try to clean up uploaded file
      await supabase.storage.from('target-documents').remove([uploadData.path]);
      return c.json({
        error: 'Database Error',
        message: insertError.message
      }, 500);
    }

    return c.json(document, 200);

  } catch (error) {
    console.error('Document upload error:', error);
    return c.json({
      error: 'Internal Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, 500);
  }
});

export default app;
