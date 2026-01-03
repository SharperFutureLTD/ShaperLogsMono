// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { createUserClient } from '../db/client';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const GeneratedContentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.string(),
  prompt: z.string(),
  content: z.string(),
  work_entry_ids: z.array(z.string()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const CreateGeneratedContentSchema = z.object({
  type: z.string().min(1),
  prompt: z.string().min(1),
  content: z.string().min(1),
  work_entry_ids: z.array(z.string()).optional(),
});

// GET /api/generated-content - List all generated content
const listRoute = createRoute({
  method: 'get',
  path: '/api/generated-content',
  tags: ['Generated Content'],
  middleware: [authMiddleware] as any,
  responses: {
    200: {
      description: 'List of generated content',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(GeneratedContentSchema),
          }),
        },
      },
    },
  },
});

app.openapi(listRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);

  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json(
      {
        error: 'Database Error',
        message: error.message,
        status: 500,
      },
      500
    );
  }

  return c.json({ data: data || [] });
});

// POST /api/generated-content - Save generated content
const saveRoute = createRoute({
  method: 'post',
  path: '/api/generated-content',
  tags: ['Generated Content'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateGeneratedContentSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Generated content saved',
      content: {
        'application/json': {
          schema: GeneratedContentSchema,
        },
      },
    },
  },
});

app.openapi(saveRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const body = c.req.valid('json');

  const { data, error } = await supabase
    .from('generated_content')
    .insert({
      user_id: userId,
      type: body.type,
      prompt: body.prompt,
      content: body.content,
      work_entry_ids: body.work_entry_ids || null,
    })
    .select()
    .single();

  if (error) {
    return c.json(
      {
        error: 'Database Error',
        message: error.message,
        status: 500,
      },
      500
    );
  }

  return c.json(data, 201);
});

// DELETE /api/generated-content/:id - Delete generated content
const deleteRoute = createRoute({
  method: 'delete',
  path: '/api/generated-content/{id}',
  tags: ['Generated Content'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Content deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
    },
  },
});

app.openapi(deleteRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { id } = c.req.valid('param');

  const { error } = await supabase
    .from('generated_content')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return c.json(
      {
        error: 'Database Error',
        message: error.message,
        status: 500,
      },
      500
    );
  }

  return c.json({ success: true });
});

export default app;
