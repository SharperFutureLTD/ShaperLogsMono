import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { supabase } from '../db/client';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const SmartDataSchema = z.object({
  specific: z.string().optional(),
  measurable: z.string().optional(),
  achievable: z.string().optional(),
  relevant: z.string().optional(),
  timeBound: z.string().optional(),
});

const WorkEntryTargetSchema = z.object({
  id: z.string().uuid(),
  work_entry_id: z.string().uuid().nullable(),
  target_id: z.string().uuid().nullable(),
  contribution_value: z.number().nullable(),
  contribution_note: z.string().nullable(),
  smart_data: SmartDataSchema.nullable(),
  created_at: z.string().datetime().nullable(),
});

const CreateWorkEntryTargetSchema = z.object({
  work_entry_id: z.string().uuid(),
  target_id: z.string().uuid(),
  contribution_value: z.number().optional(),
  contribution_note: z.string().optional(),
  smart_data: SmartDataSchema.optional(),
});

// POST /api/work-entry-targets - Link work entry to target
const createLinkRoute = createRoute({
  method: 'post',
  path: '/api/work-entry-targets',
  tags: ['Work Entries'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateWorkEntryTargetSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Link created',
      content: {
        'application/json': {
          schema: WorkEntryTargetSchema,
        },
      },
    },
  },
});

app.openapi(createLinkRoute, async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  // Verify work entry belongs to user
  const { data: workEntry } = await supabase
    .from('work_entries')
    .select('id')
    .eq('id', body.work_entry_id)
    .eq('user_id', userId)
    .single();

  if (!workEntry) {
    return c.json(
      {
        error: 'Forbidden',
        message: 'Work entry not found or does not belong to user',
        status: 403,
      },
      403
    );
  }

  // Verify target belongs to user
  const { data: target } = await supabase
    .from('targets')
    .select('id')
    .eq('id', body.target_id)
    .eq('user_id', userId)
    .single();

  if (!target) {
    return c.json(
      {
        error: 'Forbidden',
        message: 'Target not found or does not belong to user',
        status: 403,
      },
      403
    );
  }

  const { data, error } = await supabase
    .from('work_entry_targets')
    .insert({
      work_entry_id: body.work_entry_id,
      target_id: body.target_id,
      contribution_value: body.contribution_value || null,
      contribution_note: body.contribution_note || null,
      smart_data: body.smart_data || null,
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

export default app;
