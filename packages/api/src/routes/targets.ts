// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { createUserClient } from '../db/client';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const TargetSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(['kpi', 'ksb', 'sales_target', 'goal']).nullable(),
  target_value: z.number().nullable(),
  current_value: z.number().nullable(),
  unit: z.string().nullable(),
  currency_code: z.string().nullable(),
  deadline: z.string().datetime().nullable(),
  source_document_id: z.string().nullable(),
  status: z.enum(['active', 'archived', 'deleted']).nullable(), // NEW: Lifecycle status
  is_active: z.boolean().nullable(), // DEPRECATED: Kept for backward compatibility
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
});

const CreateTargetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['kpi', 'ksb', 'sales_target', 'goal']).optional(),
  target_value: z.number().optional(),
  current_value: z.number().optional(),
  unit: z.string().optional(),
  currency_code: z.string().optional(),
  deadline: z.string().datetime().optional(),
  source_document_id: z.string().optional(),
});

const UpdateTargetSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['kpi', 'ksb', 'sales_target', 'goal']).optional(),
  target_value: z.number().optional(),
  current_value: z.number().optional(),
  unit: z.string().optional(),
  deadline: z.string().datetime().optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(), // NEW: Lifecycle status
  is_active: z.boolean().optional(), // DEPRECATED: Kept for backward compatibility
});

// GET /api/targets - List all targets
const listRoute = createRoute({
  method: 'get',
  path: '/api/targets',
  tags: ['Targets'],
  middleware: [authMiddleware] as any,
  request: {
    query: z.object({
      is_active: z.string().optional(), // DEPRECATED: Use status instead
      status: z.string().optional(), // NEW: Filter by status (active, archived, deleted)
    }),
  },
  responses: {
    200: {
      description: 'List of targets',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(TargetSchema),
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
  const { is_active, status } = c.req.valid('query');

  let query = supabase
    .from('targets')
    .select('*')
    .eq('user_id', userId);

  // NEW: Status filter takes precedence over is_active
  if (status !== undefined) {
    query = query.eq('status', status);
  } else if (is_active !== undefined) {
    // DEPRECATED: Legacy support for is_active parameter
    const statusFilter = is_active === 'true' ? 'active' : 'deleted';
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

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

// POST /api/targets - Create a new target
const createTargetRoute = createRoute({
  method: 'post',
  path: '/api/targets',
  tags: ['Targets'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTargetSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Target created',
      content: {
        'application/json': {
          schema: TargetSchema,
        },
      },
    },
  },
});

app.openapi(createTargetRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const body = c.req.valid('json');

  const { data, error } = await supabase
    .from('targets')
    .insert({
      user_id: userId,
      name: body.name,
      description: body.description || null,
      type: body.type || null,
      target_value: body.target_value || null,
      current_value: body.current_value || 0,
      unit: body.unit || null,
      currency_code: body.currency_code || 'GBP',
      deadline: body.deadline || null,
      source_document_id: body.source_document_id || null,
      is_active: true,
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

// PUT /api/targets/:id - Update a target
const updateRoute = createRoute({
  method: 'put',
  path: '/api/targets/{id}',
  tags: ['Targets'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateTargetSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Target updated',
      content: {
        'application/json': {
          schema: TargetSchema,
        },
      },
    },
  },
});

app.openapi(updateRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const { data, error } = await supabase
    .from('targets')
    .update(body)
    .eq('id', id)
    .eq('user_id', userId)
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

  return c.json(data);
});

// PATCH /api/targets/:id/progress - Increment target progress
const progressRoute = createRoute({
  method: 'patch',
  path: '/api/targets/{id}/progress',
  tags: ['Targets'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            incrementBy: z.number().default(1),
          }),
        },
      },
      required: false,
    },
  },
  responses: {
    200: {
      description: 'Progress updated',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
            current_value: z.number(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

app.openapi(progressRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { id } = c.req.valid('param');
  const body = await c.req.json().catch(() => ({ incrementBy: 1 }));
  const incrementBy = body.incrementBy || 1;

  // Get current value
  const { data: target } = await supabase
    .from('targets')
    .select('current_value')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!target) {
    return c.json(
      {
        error: 'Not Found',
        message: 'Target not found',
        status: 404,
      },
      404
    );
  }

  const newValue = (target.current_value || 0) + incrementBy;

  const { data, error } = await supabase
    .from('targets')
    .update({ current_value: newValue })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, current_value')
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

  return c.json({
    id: data.id,
    current_value: data.current_value!,
    message: 'Progress updated successfully',
  });
});

// PATCH /api/targets/:id/soft-delete - Soft delete a target
const softDeleteRoute = createRoute({
  method: 'patch',
  path: '/api/targets/{id}/soft-delete',
  tags: ['Targets'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Target soft deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

app.openapi(softDeleteRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { id } = c.req.valid('param');

  const { error } = await supabase
    .from('targets')
    .update({ status: 'deleted' }) // Updated to use status field
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
    message: 'Target deleted successfully',
  });
});

// PATCH /api/targets/:id/restore - Restore a soft-deleted target
const restoreRoute = createRoute({
  method: 'patch',
  path: '/api/targets/{id}/restore',
  tags: ['Targets'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Target restored',
      content: {
        'application/json': {
          schema: TargetSchema,
        },
      },
    },
  },
});

app.openapi(restoreRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { id } = c.req.valid('param');

  const { data, error } = await supabase
    .from('targets')
    .update({ status: 'active' }) // Updated to use status field
    .eq('id', id)
    .eq('user_id', userId)
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

  return c.json(data);
});

// PATCH /api/targets/:id/archive - Archive a target
const archiveRoute = createRoute({
  method: 'patch',
  path: '/api/targets/{id}/archive',
  tags: ['Targets'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Target archived',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

app.openapi(archiveRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { id } = c.req.valid('param');

  const { error } = await supabase
    .from('targets')
    .update({ status: 'archived' })
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
    message: 'Target archived successfully',
  });
});

// PATCH /api/targets/:id/unarchive - Unarchive a target
const unarchiveRoute = createRoute({
  method: 'patch',
  path: '/api/targets/{id}/unarchive',
  tags: ['Targets'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Target unarchived',
      content: {
        'application/json': {
          schema: TargetSchema,
        },
      },
    },
  },
});

app.openapi(unarchiveRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { id } = c.req.valid('param');

  const { data, error } = await supabase
    .from('targets')
    .update({ status: 'active' })
    .eq('id', id)
    .eq('user_id', userId)
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

  return c.json(data);
});

// GET /api/targets/:targetId/evidence - Get evidence for a target
const evidenceRoute = createRoute({
  method: 'get',
  path: '/api/targets/{targetId}/evidence',
  tags: ['Targets'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      targetId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Target evidence list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.any()),
          }),
        },
      },
    },
  },
});

app.openapi(evidenceRoute, async (c) => {
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { targetId } = c.req.valid('param');

  const { data, error } = await supabase
    .from('work_entry_targets')
    .select(`
      *,
      work_entry:work_entries (
        id,
        redacted_summary,
        category,
        created_at
      )
    `)
    .eq('target_id', targetId);

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

export default app;
