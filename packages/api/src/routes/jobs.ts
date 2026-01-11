// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { supabase } from '../db/client';
import { summaryGenerator } from '../services/summary-generator';
import { aiProfileGenerator } from '../services/ai-profile-generator';
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  subQuarters,
  subYears,
} from 'date-fns';

const app = new OpenAPIHono();

// Service key authentication for background jobs
function validateServiceKey(authHeader: string | undefined): boolean {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !authHeader) return false;
  return authHeader === `Bearer ${serviceKey}`;
}

// Middleware to validate service key
const serviceKeyAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!validateServiceKey(authHeader)) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Invalid service key',
        status: 401,
      },
      401
    );
  }
  await next();
};

// POST /api/jobs/summaries - Trigger summary generation for all users
const generateSummariesRoute = createRoute({
  method: 'post',
  path: '/api/jobs/summaries',
  tags: ['Background Jobs'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            type: z.enum(['monthly', 'quarterly', 'yearly']),
            user_id: z.string().uuid().optional(), // Optional: only generate for specific user
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Summary generation results',
      content: {
        'application/json': {
          schema: z.object({
            processed: z.number(),
            successful: z.number(),
            failed: z.number(),
            results: z.array(
              z.object({
                userId: z.string(),
                status: z.enum(['success', 'failed', 'skipped']),
                error: z.string().optional(),
              })
            ),
          }),
        },
      },
    },
  },
});

app.use('/api/jobs/*', serviceKeyAuth);

app.openapi(generateSummariesRoute, async (c) => {
  const { type, user_id } = c.req.valid('json');
  const now = new Date();

  // Determine period dates based on type
  let periodStart: Date;
  let periodEnd: Date;

  switch (type) {
    case 'monthly':
      periodStart = startOfMonth(subMonths(now, 1));
      periodEnd = endOfMonth(subMonths(now, 1));
      break;
    case 'quarterly':
      periodStart = startOfQuarter(subQuarters(now, 1));
      periodEnd = endOfQuarter(subQuarters(now, 1));
      break;
    case 'yearly':
      periodStart = startOfYear(subYears(now, 1));
      periodEnd = endOfYear(subYears(now, 1));
      break;
  }

  // Get users to process
  let usersToProcess: { user_id: string }[];

  if (user_id) {
    usersToProcess = [{ user_id }];
  } else {
    // Get all users with profiles
    const { data: users, error } = await supabase
      .from('profiles')
      .select('user_id');

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
    usersToProcess = users || [];
  }

  const results: { userId: string; status: 'success' | 'failed' | 'skipped'; error?: string }[] = [];
  let successful = 0;
  let failed = 0;

  for (const user of usersToProcess) {
    const jobLog = {
      job_type: 'summary_generation',
      user_id: user.user_id,
      status: 'running' as const,
      started_at: new Date().toISOString(),
      metadata: { type, period_start: periodStart.toISOString(), period_end: periodEnd.toISOString() },
    };

    // Log job start
    const { data: job } = await supabase
      .from('background_job_logs')
      .insert(jobLog)
      .select()
      .single();

    try {
      let summary;
      switch (type) {
        case 'monthly':
          summary = await summaryGenerator.generateMonthlySummary({
            userId: user.user_id,
            periodType: 'monthly',
            periodStart,
            periodEnd,
          });
          break;
        case 'quarterly':
          summary = await summaryGenerator.generateQuarterlySummary({
            userId: user.user_id,
            periodType: 'quarterly',
            periodStart,
            periodEnd,
          });
          break;
        case 'yearly':
          summary = await summaryGenerator.generateYearlySummary({
            userId: user.user_id,
            periodType: 'yearly',
            periodStart,
            periodEnd,
          });
          break;
      }

      if (summary) {
        // Update job log - success
        await supabase
          .from('background_job_logs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job?.id);

        results.push({ userId: user.user_id, status: 'success' });
        successful++;
      } else {
        // No entries for period
        await supabase
          .from('background_job_logs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: { ...jobLog.metadata, note: 'No entries for period' },
          })
          .eq('id', job?.id);

        results.push({ userId: user.user_id, status: 'skipped', error: 'No entries for period' });
      }
    } catch (error) {
      // Update job log - failed
      await supabase
        .from('background_job_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: (error as Error).message,
        })
        .eq('id', job?.id);

      results.push({
        userId: user.user_id,
        status: 'failed',
        error: (error as Error).message,
      });
      failed++;
    }
  }

  return c.json({
    processed: usersToProcess.length,
    successful,
    failed,
    results,
  });
});

// POST /api/jobs/ai-profiles - Trigger AI profile generation for active users
const generateAIProfilesRoute = createRoute({
  method: 'post',
  path: '/api/jobs/ai-profiles',
  tags: ['Background Jobs'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            user_id: z.string().uuid().optional(), // Optional: only generate for specific user
            days_active: z.number().optional().default(30), // Only users with activity in last N days
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'AI profile generation results',
      content: {
        'application/json': {
          schema: z.object({
            processed: z.number(),
            successful: z.number(),
            failed: z.number(),
            results: z.array(
              z.object({
                userId: z.string(),
                status: z.enum(['success', 'failed', 'skipped']),
                error: z.string().optional(),
              })
            ),
          }),
        },
      },
    },
  },
});

app.openapi(generateAIProfilesRoute, async (c) => {
  const { user_id, days_active } = c.req.valid('json');

  let usersToProcess: string[];

  if (user_id) {
    usersToProcess = [user_id];
  } else {
    // Get users with recent activity
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (days_active || 30));

    const { data: activeUsers, error } = await supabase
      .from('work_entries')
      .select('user_id')
      .gte('created_at', cutoffDate.toISOString());

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

    // Deduplicate user IDs
    usersToProcess = [...new Set(activeUsers?.map((u) => u.user_id) || [])];
  }

  const results: { userId: string; status: 'success' | 'failed' | 'skipped'; error?: string }[] = [];
  let successful = 0;
  let failed = 0;

  for (const userId of usersToProcess) {
    const jobLog = {
      job_type: 'ai_profile_generation',
      user_id: userId,
      status: 'running' as const,
      started_at: new Date().toISOString(),
      metadata: {},
    };

    // Log job start
    const { data: job } = await supabase
      .from('background_job_logs')
      .insert(jobLog)
      .select()
      .single();

    try {
      await aiProfileGenerator.generateProfile(userId);

      // Update job log - success
      await supabase
        .from('background_job_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job?.id);

      results.push({ userId, status: 'success' });
      successful++;
    } catch (error) {
      // Update job log - failed
      await supabase
        .from('background_job_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: (error as Error).message,
        })
        .eq('id', job?.id);

      results.push({
        userId,
        status: 'failed',
        error: (error as Error).message,
      });
      failed++;
    }
  }

  return c.json({
    processed: usersToProcess.length,
    successful,
    failed,
    results,
  });
});

// GET /api/jobs/status - Get recent job history
const getJobStatusRoute = createRoute({
  method: 'get',
  path: '/api/jobs/status',
  tags: ['Background Jobs'],
  request: {
    query: z.object({
      job_type: z.enum(['summary_generation', 'ai_profile_generation']).optional(),
      limit: z.string().optional().default('50'),
    }),
  },
  responses: {
    200: {
      description: 'Recent job logs',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(
              z.object({
                id: z.string().uuid(),
                job_type: z.string(),
                user_id: z.string().uuid().nullable(),
                status: z.string(),
                started_at: z.string().datetime().nullable(),
                completed_at: z.string().datetime().nullable(),
                error_message: z.string().nullable(),
                metadata: z.record(z.unknown()),
                created_at: z.string().datetime(),
              })
            ),
            stats: z.object({
              total: z.number(),
              completed: z.number(),
              failed: z.number(),
              running: z.number(),
            }),
          }),
        },
      },
    },
  },
});

app.openapi(getJobStatusRoute, async (c) => {
  const { job_type, limit } = c.req.valid('query');

  let query = supabase
    .from('background_job_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit || '50'));

  if (job_type) {
    query = query.eq('job_type', job_type);
  }

  const { data, error } = await query;

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

  // Calculate stats
  const stats = {
    total: data?.length || 0,
    completed: data?.filter((j) => j.status === 'completed').length || 0,
    failed: data?.filter((j) => j.status === 'failed').length || 0,
    running: data?.filter((j) => j.status === 'running').length || 0,
  };

  return c.json({
    data: data || [],
    stats,
  });
});

export default app;
