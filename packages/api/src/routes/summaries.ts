// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { createUserClient } from '../db/client';
import { summaryGenerator } from '../services/summary-generator';
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
  parse,
} from 'date-fns';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const PeriodicSummarySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  period_type: z.enum(['monthly', 'quarterly', 'yearly']),
  period_start: z.string(),
  period_end: z.string(),
  summary_text: z.string(),
  top_skills: z.array(z.string()),
  top_achievements: z.array(z.string()),
  key_metrics: z.record(z.unknown()),
  categories_breakdown: z.record(z.number()),
  work_entry_count: z.number(),
  token_count: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const GenerateSummaryRequestSchema = z.object({
  period_type: z.enum(['monthly', 'quarterly', 'yearly']),
  period_date: z.string().optional(), // e.g., "2025-01" for monthly, "2025-Q1" for quarterly, "2025" for yearly
});

// GET /api/summaries - List all summaries
const listSummariesRoute = createRoute({
  method: 'get',
  path: '/api/summaries',
  tags: ['Summaries'],
  middleware: [authMiddleware] as any,
  request: {
    query: z.object({
      period_type: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of periodic summaries',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(PeriodicSummarySchema),
          }),
        },
      },
    },
  },
});

app.openapi(listSummariesRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const { period_type, limit } = c.req.valid('query');
  const supabase = createUserClient(token);

  let query = supabase
    .from('periodic_summaries')
    .select('*')
    .eq('user_id', userId)
    .order('period_start', { ascending: false });

  if (period_type) {
    query = query.eq('period_type', period_type);
  }

  if (limit) {
    query = query.limit(parseInt(limit));
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

  return c.json({ data: data || [] });
});

// GET /api/summaries/:period/:date - Get specific summary
const getSummaryRoute = createRoute({
  method: 'get',
  path: '/api/summaries/{period}/{date}',
  tags: ['Summaries'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      period: z.enum(['monthly', 'quarterly', 'yearly']),
      date: z.string(), // e.g., "2025-01", "2025-Q1", "2025"
    }),
  },
  responses: {
    200: {
      description: 'Periodic summary',
      content: {
        'application/json': {
          schema: PeriodicSummarySchema,
        },
      },
    },
    404: {
      description: 'Summary not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

app.openapi(getSummaryRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const { period, date } = c.req.valid('param');
  const supabase = createUserClient(token);

  // Parse the date parameter to get period_start
  let periodStart: string;
  try {
    periodStart = parsePeriodDate(period, date);
  } catch (e) {
    return c.json(
      {
        error: 'Invalid Date',
        message: `Invalid date format for ${period}: ${date}`,
      },
      400
    );
  }

  const { data, error } = await supabase
    .from('periodic_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', period)
    .eq('period_start', periodStart)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json(
        {
          error: 'Not Found',
          message: `No ${period} summary found for ${date}`,
        },
        404
      );
    }
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

// POST /api/summaries/generate - Generate summary on demand
const generateSummaryRoute = createRoute({
  method: 'post',
  path: '/api/summaries/generate',
  tags: ['Summaries'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateSummaryRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Generated summary',
      content: {
        'application/json': {
          schema: PeriodicSummarySchema.nullable(),
        },
      },
    },
  },
});

app.openapi(generateSummaryRoute, async (c) => {
  const userId = c.get('userId');
  const { period_type, period_date } = c.req.valid('json');

  // Calculate period start/end based on date or default to previous period
  const { periodStart, periodEnd } = calculatePeriodDates(period_type, period_date);

  try {
    let summary;
    switch (period_type) {
      case 'monthly':
        summary = await summaryGenerator.generateMonthlySummary({
          userId,
          periodType: 'monthly',
          periodStart,
          periodEnd,
        });
        break;
      case 'quarterly':
        summary = await summaryGenerator.generateQuarterlySummary({
          userId,
          periodType: 'quarterly',
          periodStart,
          periodEnd,
        });
        break;
      case 'yearly':
        summary = await summaryGenerator.generateYearlySummary({
          userId,
          periodType: 'yearly',
          periodStart,
          periodEnd,
        });
        break;
    }

    return c.json(summary);
  } catch (error) {
    return c.json(
      {
        error: 'Generation Error',
        message: (error as Error).message,
        status: 500,
      },
      500
    );
  }
});

// DELETE /api/summaries/:id - Delete a summary
const deleteSummaryRoute = createRoute({
  method: 'delete',
  path: '/api/summaries/{id}',
  tags: ['Summaries'],
  middleware: [authMiddleware] as any,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Summary deleted',
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

app.openapi(deleteSummaryRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const { id } = c.req.valid('param');
  const supabase = createUserClient(token);

  const { error } = await supabase
    .from('periodic_summaries')
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

// Helper functions
function parsePeriodDate(
  periodType: 'monthly' | 'quarterly' | 'yearly',
  dateStr: string
): string {
  switch (periodType) {
    case 'monthly':
      // Expect format: "2025-01"
      const monthMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
      if (!monthMatch) throw new Error('Invalid monthly date format');
      return `${monthMatch[1]}-${monthMatch[2]}-01`;

    case 'quarterly':
      // Expect format: "2025-Q1" or "2025Q1"
      const quarterMatch = dateStr.match(/^(\d{4})-?Q([1-4])$/i);
      if (!quarterMatch) throw new Error('Invalid quarterly date format');
      const quarterMonth = (parseInt(quarterMatch[2]) - 1) * 3 + 1;
      return `${quarterMatch[1]}-${quarterMonth.toString().padStart(2, '0')}-01`;

    case 'yearly':
      // Expect format: "2025"
      const yearMatch = dateStr.match(/^(\d{4})$/);
      if (!yearMatch) throw new Error('Invalid yearly date format');
      return `${yearMatch[1]}-01-01`;

    default:
      throw new Error('Invalid period type');
  }
}

function calculatePeriodDates(
  periodType: 'monthly' | 'quarterly' | 'yearly',
  periodDate?: string
): { periodStart: Date; periodEnd: Date } {
  const now = new Date();

  if (periodDate) {
    // Parse provided date
    switch (periodType) {
      case 'monthly': {
        const match = periodDate.match(/^(\d{4})-(\d{2})$/);
        if (match) {
          const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, 1);
          return {
            periodStart: startOfMonth(date),
            periodEnd: endOfMonth(date),
          };
        }
        break;
      }
      case 'quarterly': {
        const match = periodDate.match(/^(\d{4})-?Q([1-4])$/i);
        if (match) {
          const quarterMonth = (parseInt(match[2]) - 1) * 3;
          const date = new Date(parseInt(match[1]), quarterMonth, 1);
          return {
            periodStart: startOfQuarter(date),
            periodEnd: endOfQuarter(date),
          };
        }
        break;
      }
      case 'yearly': {
        const match = periodDate.match(/^(\d{4})$/);
        if (match) {
          const date = new Date(parseInt(match[1]), 0, 1);
          return {
            periodStart: startOfYear(date),
            periodEnd: endOfYear(date),
          };
        }
        break;
      }
    }
  }

  // Default to previous period
  switch (periodType) {
    case 'monthly':
      return {
        periodStart: startOfMonth(subMonths(now, 1)),
        periodEnd: endOfMonth(subMonths(now, 1)),
      };
    case 'quarterly':
      return {
        periodStart: startOfQuarter(subQuarters(now, 1)),
        periodEnd: endOfQuarter(subQuarters(now, 1)),
      };
    case 'yearly':
      return {
        periodStart: startOfYear(subYears(now, 1)),
        periodEnd: endOfYear(subYears(now, 1)),
      };
  }
}

export default app;
