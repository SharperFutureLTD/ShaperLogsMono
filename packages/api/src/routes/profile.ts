// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { createUserClient } from '../db/client';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const ProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  display_name: z.string().nullable(),
  industry: z.string().nullable(),
  employment_status: z.enum(['employed', 'job_seeking', 'student', 'apprentice']).nullable(),
  study_field: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const UpdateProfileSchema = z.object({
  employmentStatus: z.enum(['employed', 'job_seeking', 'student', 'apprentice']).optional(),
  industry: z.string().optional(),
  studyField: z.string().optional(),
});

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  status: z.number(),
});

// GET /api/profile - Get user profile
const getRoute = createRoute({
  method: 'get',
  path: '/api/profile',
  tags: ['Profile'],
  middleware: [authMiddleware] as any,
  responses: {
    200: {
      description: 'User profile',
      content: {
        'application/json': {
          schema: ProfileSchema,
        },
      },
    },
    404: {
      description: 'Profile not found',
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

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return c.json(
      {
        error: 'Not Found',
        message: 'Profile not found',
        status: 404,
      },
      404
    );
  }

  return c.json(data);
});

// PUT /api/profile - Update user profile
const updateRoute = createRoute({
  method: 'put',
  path: '/api/profile',
  tags: ['Profile'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateProfileSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile updated',
      content: {
        'application/json': {
          schema: ProfileSchema,
        },
      },
    },
  },
});

app.openapi(updateRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const body = c.req.valid('json');

  const updateData: any = {};
  if (body.employmentStatus) updateData.employment_status = body.employmentStatus;
  if (body.industry) updateData.industry = body.industry;
  if (body.studyField) updateData.study_field = body.studyField;

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
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

// PATCH /api/profile/industry - Update industry
const updateIndustryRoute = createRoute({
  method: 'patch',
  path: '/api/profile/industry',
  tags: ['Profile'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            industry: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Industry updated',
      content: {
        'application/json': {
          schema: ProfileSchema,
        },
      },
    },
  },
});

app.openapi(updateIndustryRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { industry } = c.req.valid('json');

  const { data, error } = await supabase
    .from('profiles')
    .update({ industry })
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

// PATCH /api/profile/employment-status - Update employment status
const updateEmploymentStatusRoute = createRoute({
  method: 'patch',
  path: '/api/profile/employment-status',
  tags: ['Profile'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            employmentStatus: z.enum(['employed', 'job_seeking', 'student', 'apprentice']),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Employment status updated',
      content: {
        'application/json': {
          schema: ProfileSchema,
        },
      },
    },
  },
});

app.openapi(updateEmploymentStatusRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { employmentStatus } = c.req.valid('json');

  const { data, error } = await supabase
    .from('profiles')
    .update({ employment_status: employmentStatus })
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

// PATCH /api/profile/study-field - Update study field
const updateStudyFieldRoute = createRoute({
  method: 'patch',
  path: '/api/profile/study-field',
  tags: ['Profile'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            studyField: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Study field updated',
      content: {
        'application/json': {
          schema: ProfileSchema,
        },
      },
    },
  },
});

app.openapi(updateStudyFieldRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const { studyField } = c.req.valid('json');

  const { data, error } = await supabase
    .from('profiles')
    .update({ study_field: studyField })
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

// PATCH /api/profile/onboarding - Complete onboarding
const onboardingRoute = createRoute({
  method: 'patch',
  path: '/api/profile/onboarding',
  tags: ['Profile'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            employmentStatus: z.enum(['employed', 'job_seeking', 'student', 'apprentice']),
            industry: z.string(),
            studyField: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Onboarding completed',
      content: {
        'application/json': {
          schema: ProfileSchema,
        },
      },
    },
  },
});

app.openapi(onboardingRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);
  const body = c.req.valid('json');

  const updateData: any = {
    employment_status: body.employmentStatus,
    industry: body.industry,
  };

  if (body.studyField) {
    updateData.study_field = body.studyField;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
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

export default app;
