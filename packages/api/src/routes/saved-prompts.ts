// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { createUserClient } from '../db/client';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const SavedPromptSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  prompt_text: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const CreateSavedPromptSchema = z.object({
  name: z.string().min(1).max(100),
  prompt_text: z.string().min(1),
});

// GET /api/saved-prompts - List all saved prompts
const listRoute = createRoute({
  method: 'get',
  path: '/api/saved-prompts',
  tags: ['Saved Prompts'],
  middleware: [authMiddleware] as any,
  responses: {
    200: {
      description: 'List of saved prompts',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(SavedPromptSchema),
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
    .from('saved_prompts')
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

// POST /api/saved-prompts - Create saved prompt
const createSavedPromptRoute = createRoute({
  method: 'post',
  path: '/api/saved-prompts',
  tags: ['Saved Prompts'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateSavedPromptSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Saved prompt created',
      content: {
        'application/json': {
          schema: SavedPromptSchema,
        },
      },
    },
  },
});

app.openapi(createSavedPromptRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const body = c.req.valid('json');

  const { data, error } = await supabase
    .from('saved_prompts')
    .insert({
      user_id: userId,
      name: body.name,
      prompt_text: body.prompt_text,
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

// DELETE /api/saved-prompts/:id - Delete saved prompt
const deleteRoute = createRoute({
  method: 'delete',
  path: '/api/saved-prompts/{id}',
  tags: ['Saved Prompts'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Prompt deleted',
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
    .from('saved_prompts')
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
