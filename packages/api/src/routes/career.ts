// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { createUserClient } from '../db/client';
import { extractTextFromPDF } from '../utils/pdf-parser';
import { AIProviderFactory } from '../ai/factory';
import { WordProcessor } from '../utils/file-processors/word-processor';

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

const wordProcessor = new WordProcessor();

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const CareerHistorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  company: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  is_current: z.boolean().nullable(),
  description: z.string().nullable(),
  skills: z.array(z.string()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const CreateCareerHistorySchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_current: z.boolean().optional(),
  description: z.string().nullable().optional(),
  skills: z.array(z.string()).optional(),
});

// GET /api/career - List career history
app.openapi(
  createRoute({
    method: 'get',
    path: '/api/career',
    tags: ['Career'],
    middleware: [authMiddleware] as any,
    responses: {
      200: {
        description: 'List of career history',
        content: {
          'application/json': {
            schema: z.object({
              data: z.array(CareerHistorySchema),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const token = c.get('token');
    const supabase = createUserClient(token);

    const { data, error } = await supabase
      .from('career_history')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) {
      return c.json({ error: 'Database Error', message: error.message, status: 500 }, 500);
    }

    return c.json({ data: data || [] });
  }
);

// POST /api/career - Add career history entry
app.openapi(
  createRoute({
    method: 'post',
    path: '/api/career',
    tags: ['Career'],
    middleware: [authMiddleware] as any,
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateCareerHistorySchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Career history entry created',
        content: {
          'application/json': {
            schema: CareerHistorySchema,
          },
        },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const token = c.get('token');
    const supabase = createUserClient(token);
    const body = c.req.valid('json');

    const { data, error } = await supabase
      .from('career_history')
      .insert({
        user_id: userId,
        ...body
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: 'Database Error', message: error.message, status: 500 }, 500);
    }

    return c.json(data, 201);
  }
);

// DELETE /api/career/:id - Delete entry
app.openapi(
  createRoute({
    method: 'delete',
    path: '/api/career/{id}',
    tags: ['Career'],
    middleware: [authMiddleware] as any,
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: 'Entry deleted',
        content: {
          'application/json': {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const token = c.get('token');
    const supabase = createUserClient(token);
    const { id } = c.req.valid('param');

    const { error } = await supabase
      .from('career_history')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return c.json({ error: 'Database Error', message: error.message, status: 500 }, 500);
    }

    return c.json({ success: true });
  }
);

// POST /api/career/bulk - Create multiple career history entries at once
app.openapi(
  createRoute({
    method: 'post',
    path: '/api/career/bulk',
    tags: ['Career'],
    middleware: [authMiddleware] as any,
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              items: z.array(CreateCareerHistorySchema).min(1).max(100),
            }),
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Career history entries created',
        content: {
          'application/json': {
            schema: z.object({
              data: z.array(CareerHistorySchema),
              count: z.number(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const userId = c.get('userId');
    const token = c.get('token');
    const supabase = createUserClient(token);
    const { items } = c.req.valid('json');

    // Prepare all items with user_id
    const itemsToInsert = items.map((item) => ({
      user_id: userId,
      title: item.title,
      company: item.company,
      start_date: item.start_date || null,
      end_date: item.end_date || null,
      is_current: item.is_current || false,
      description: item.description || null,
      skills: item.skills || null,
    }));

    const { data, error } = await supabase
      .from('career_history')
      .insert(itemsToInsert)
      .select();

    if (error) {
      return c.json({ error: 'Database Error', message: error.message, status: 500 }, 500);
    }

    return c.json({ data: data || [], count: data?.length || 0 }, 201);
  }
);

// POST /api/career/upload-resume - Parse resume (PDF or Word)
app.openapi(
  createRoute({
    method: 'post',
    path: '/api/career/upload-resume',
    tags: ['Career'],
    middleware: [authMiddleware] as any,
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: z.object({
              file: z.instanceof(File),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Resume parsed',
        content: {
          'application/json': {
            schema: z.object({
              history: z.array(CreateCareerHistorySchema),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    try {
      const body = await c.req.parseBody();
      const file = body.file;

      if (!file || !(file instanceof File)) {
        return c.json({ error: 'Bad Request', message: 'No file provided', status: 400 }, 400);
      }

      if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
        return c.json({
          error: 'Bad Request',
          message: 'Invalid file type. Please upload a PDF or Word document (.pdf, .docx, .doc)',
          status: 400
        }, 400);
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract text based on file type
      let text: string;
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(buffer);
      } else {
        // Word document (.docx or .doc)
        const processed = await wordProcessor.process(buffer, file.type);
        text = processed.content;
      }

      if (!text || text.trim().length === 0) {
        return c.json({
          error: 'Bad Request',
          message: 'Could not extract text from the document. The file may be empty or contain only images.',
          status: 400
        }, 400);
      }

      // Use AI to extract structured history
      const aiProvider = AIProviderFactory.getProvider();
      const systemPrompt = `You are an expert resume parser. Extract the candidate's career history into a structured JSON format.
      For each role, identify:
      - title: Job title
      - company: Company name
      - start_date: YYYY-MM-DD (approximate first of month if day unknown)
      - end_date: YYYY-MM-DD (or null if current)
      - is_current: boolean
      - description: Brief summary of responsibilities and achievements
      - skills: Array of key skills used in this role

      Return ONLY a JSON object with a "history" array.`;

      const response = await aiProvider.complete({
        messages: [{ role: 'user', content: `Parse this resume:\n\n${text}` }],
        systemPrompt,
        responseFormat: 'json',
      });

      let history = [];
      try {
        const parsed = JSON.parse(response.content);
        history = parsed.history || [];
      } catch (e) {
        console.error('Failed to parse AI response', e);
      }

      return c.json({ history });
    } catch (error) {
      console.error('Resume upload error:', error);
      const message = error instanceof Error ? error.message : 'Failed to process resume';
      return c.json({ error: 'Internal Error', message, status: 500 }, 500);
    }
  }
);

export default app;
