import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { createUserClient } from '../db/client';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas for validation
const WorkEntrySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  redacted_summary: z.string(),
  encrypted_original: z.string(),
  skills: z.array(z.string()).nullable(),
  achievements: z.array(z.string()).nullable(),
  metrics: z.record(z.unknown()).nullable(),
  category: z.string().nullable(),
  target_ids: z.array(z.string()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const CreateWorkEntrySchema = z.object({
  redacted_summary: z.string().min(1),
  encrypted_original: z.string().min(1),
  skills: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
  metrics: z.record(z.unknown()).optional(),
  category: z.string().optional(),
  target_ids: z.array(z.string()).optional(),
});

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  status: z.number(),
});

// GET /api/work-entries - List all work entries
const listRoute = createRoute({
  method: 'get',
  path: '/api/work-entries',
  tags: ['Work Entries'],
  middleware: [authMiddleware] as any,
  request: {
    query: z.object({
      page: z.string().optional().default('1'),
      limit: z.string().optional().default('20'),
    }),
  },
  responses: {
    200: {
      description: 'List of work entries',
      content: {
        'application/json': {
          schema: z.object({
            entries: z.array(WorkEntrySchema),
            meta: z.object({
              total: z.number(),
              page: z.number(),
              limit: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(listRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const query = c.req.valid('query');
  
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '20');
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Get total count
  const { count, error: countError } = await supabase
    .from('work_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    return c.json(
      {
        error: 'Database Error',
        message: countError.message,
        status: 500,
      },
      500
    );
  }

  // Get paginated data
  const { data, error } = await supabase
    .from('work_entries')
    .select('id, user_id, redacted_summary, skills, achievements, metrics, category, target_ids, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

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

  return c.json({
    entries: data || [],
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  });
});

// POST /api/work-entries - Create a new work entry
const createWorkEntryRoute = createRoute({
  method: 'post',
  path: '/api/work-entries',
  tags: ['Work Entries'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateWorkEntrySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Work entry created',
      content: {
        'application/json': {
          schema: WorkEntrySchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(createWorkEntryRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const body = c.req.valid('json');

  const { data, error } = await supabase
    .from('work_entries')
    .insert({
      user_id: userId,
      redacted_summary: body.redacted_summary,
      encrypted_original: body.encrypted_original,
      skills: body.skills || null,
      achievements: body.achievements || null,
      metrics: body.metrics || null,
      category: body.category || null,
      target_ids: body.target_ids || null,
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

// GET /api/work-entries/:id - Get a single work entry
const getRoute = createRoute({
  method: 'get',
  path: '/api/work-entries/{id}',
  tags: ['Work Entries'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Work entry details',
      content: {
        'application/json': {
          schema: z.object({
            entry: WorkEntrySchema,
          }),
        },
      },
    },
    404: {
      description: 'Work entry not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(getRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { id } = c.req.valid('param');

  const { data, error } = await supabase
    .from('work_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return c.json(
      {
        error: 'Not Found',
        message: 'Work entry not found',
        status: 404,
      },
      404
    );
  }

  return c.json({ entry: data });
});

// DELETE /api/work-entries/:id - Delete a work entry
const deleteRoute = createRoute({
  method: 'delete',
  path: '/api/work-entries/{id}',
  tags: ['Work Entries'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Work entry deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: 'Work entry not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
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
    .from('work_entries')
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

  return c.json({
    success: true,
    message: 'Work entry deleted successfully',
  });
});

export default app;
