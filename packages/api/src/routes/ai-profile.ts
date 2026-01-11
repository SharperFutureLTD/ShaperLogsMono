// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { createUserClient } from '../db/client';
import { aiProfileGenerator } from '../services/ai-profile-generator';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const WritingStyleSchema = z.object({
  sentenceLength: z.enum(['short', 'medium', 'long']),
  tone: z.enum(['casual', 'professional', 'technical', 'balanced']),
  patterns: z.array(z.string()),
  examples: z.array(z.string()),
  avgWordCount: z.number(),
  preferredVocabulary: z.array(z.string()),
  verbosity: z.enum(['concise', 'detailed', 'varies']),
});

const PreferencesSchema = z.object({
  preferredContentLength: z.enum(['short', 'medium', 'long']),
  formalityLevel: z.number().min(1).max(5),
  includeMetrics: z.boolean(),
});

const AIUserProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  first_name: z.string().nullable(),
  profile_name: z.string().nullable(),
  writing_style: WritingStyleSchema,
  industry: z.string().nullable(),
  employment_status: z.string().nullable(),
  // Note: current_role and current_company come from career_history table, not stored here
  career_summary: z.string().nullable(),
  career_goals: z.array(z.string()),
  regular_activities: z.array(z.string()),
  aggregated_skills: z.record(z.number()),
  skill_categories: z.record(z.array(z.string())),
  preferences: PreferencesSchema,
  last_generated_at: z.string().datetime().nullable(),
  entries_analyzed_count: z.number(),
  version: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const UpdatePreferencesSchema = z.object({
  preferredContentLength: z.enum(['short', 'medium', 'long']).optional(),
  formalityLevel: z.number().min(1).max(5).optional(),
  includeMetrics: z.boolean().optional(),
});

// GET /api/ai-profile - Get user's AI profile
const getProfileRoute = createRoute({
  method: 'get',
  path: '/api/ai-profile',
  tags: ['AI Profile'],
  middleware: [authMiddleware] as any,
  responses: {
    200: {
      description: 'AI User Profile',
      content: {
        'application/json': {
          schema: z.object({
            data: AIUserProfileSchema.nullable(),
            exists: z.boolean(),
          }),
        },
      },
    },
  },
});

app.openapi(getProfileRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const supabase = createUserClient(token);

  const { data, error } = await supabase
    .from('ai_user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
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
    data: data || null,
    exists: !!data,
  });
});

// POST /api/ai-profile/generate - Generate or regenerate AI profile
const generateProfileRoute = createRoute({
  method: 'post',
  path: '/api/ai-profile/generate',
  tags: ['AI Profile'],
  middleware: [authMiddleware] as any,
  responses: {
    200: {
      description: 'Generated AI profile',
      content: {
        'application/json': {
          schema: z.object({
            data: AIUserProfileSchema,
            generated: z.boolean(),
          }),
        },
      },
    },
  },
});

app.openapi(generateProfileRoute, async (c) => {
  const userId = c.get('userId');

  try {
    const profile = await aiProfileGenerator.generateProfile(userId);

    // Map the returned profile to database format for response
    return c.json({
      data: {
        id: profile.id,
        user_id: profile.userId,
        first_name: profile.firstName,
        profile_name: profile.profileName,
        writing_style: profile.writingStyle,
        industry: profile.industry,
        employment_status: profile.employmentStatus,
        // current_role and current_company come from career_history table
        career_summary: profile.careerSummary,
        career_goals: profile.careerGoals,
        regular_activities: profile.regularActivities,
        aggregated_skills: profile.aggregatedSkills,
        skill_categories: profile.skillCategories,
        preferences: profile.preferences,
        last_generated_at: profile.lastGeneratedAt,
        entries_analyzed_count: profile.entriesAnalyzedCount,
        version: profile.version,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      generated: true,
    });
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

// PATCH /api/ai-profile/preferences - Update generation preferences
const updatePreferencesRoute = createRoute({
  method: 'patch',
  path: '/api/ai-profile/preferences',
  tags: ['AI Profile'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdatePreferencesSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated preferences',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            preferences: PreferencesSchema,
          }),
        },
      },
    },
    404: {
      description: 'Profile not found',
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

app.openapi(updatePreferencesRoute, async (c) => {
  const userId = c.get('userId');
  const token = c.get('token');
  const updates = c.req.valid('json');
  const supabase = createUserClient(token);

  // Get existing profile
  const { data: existing, error: fetchError } = await supabase
    .from('ai_user_profiles')
    .select('preferences')
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return c.json(
        {
          error: 'Not Found',
          message: 'AI profile not found. Generate one first.',
        },
        404
      );
    }
    return c.json(
      {
        error: 'Database Error',
        message: fetchError.message,
        status: 500,
      },
      500
    );
  }

  // Merge preferences
  const mergedPreferences = {
    ...(existing?.preferences || {}),
    ...updates,
  };

  // Update
  const { error: updateError } = await supabase
    .from('ai_user_profiles')
    .update({ preferences: mergedPreferences })
    .eq('user_id', userId);

  if (updateError) {
    return c.json(
      {
        error: 'Database Error',
        message: updateError.message,
        status: 500,
      },
      500
    );
  }

  return c.json({
    success: true,
    preferences: mergedPreferences,
  });
});

export default app;
