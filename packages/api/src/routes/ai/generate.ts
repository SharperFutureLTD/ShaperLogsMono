// @ts-nocheck - New tables not yet in Database types (added via migrations)
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { AIProviderFactory } from '../../ai/factory';
import { createUserClient, supabase } from '../../db/client';
import {
  getSystemPrompt,
  getContentTypeInstructions,
  getFormatTemplate,
  getToneGuidelines,
  analyzeUserVoice,
  formatVoiceProfileForPrompt,
} from '../../ai/prompts';
import { parseTimeRange } from '../../utils/time-range-parser';
import { formatAIProfileForPrompt } from '../../ai/prompts/ai-profile-formatter';

const app = new OpenAPIHono<AuthContext>();

// Threshold for using summaries instead of raw entries
const SUMMARY_THRESHOLD = 50;

// Zod schemas
const GenerateRequestSchema = z.object({
  prompt: z.string().min(1),
  type: z.string().min(1),
  workEntries: z.array(z.any()).optional(),
  industry: z.string().min(1),
  contextDocument: z.string().optional().describe('Parsed text content from an uploaded file to guide generation structure'),
  timeRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional().describe('Explicit time range to filter entries'),
  useSummaries: z.boolean().optional().default(true).describe('Use periodic summaries for large datasets'),
});

const GenerateResponseSchema = z.object({
  content: z.string(),
  error: z.string().optional(),
  meta: z.object({
    timeRangeParsed: z.boolean().optional(),
    timeRangeDescription: z.string().optional(),
    usedSummaries: z.boolean().optional(),
    entriesUsed: z.number().optional(),
  }).optional(),
});

// POST /api/ai/generate - Generate content from work history
const generateRoute = createRoute({
  method: 'post',
  path: '/api/ai/generate',
  tags: ['AI Operations'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Content generated',
      content: {
        'application/json': {
          schema: GenerateResponseSchema,
        },
      },
    },
  },
});

// @ts-expect-error - Hono OpenAPI strict typing doesn't allow error responses in handler type
app.openapi(generateRoute, async (c) => {
  try {
    const userId = c.get('userId');
    const token = c.get('token');
    const { prompt, type, workEntries, industry, contextDocument, timeRange, useSummaries } = c.req.valid('json');

    const userSupabase = createUserClient(token);
    const meta: {
      timeRangeParsed?: boolean;
      timeRangeDescription?: string;
      usedSummaries?: boolean;
      entriesUsed?: number;
    } = {};

    // 1. Parse time range from prompt if not explicitly provided
    let effectiveTimeRange = timeRange;
    let cleanedPrompt = prompt;

    if (!effectiveTimeRange) {
      const parseResult = parseTimeRange(prompt);
      if (parseResult.timeRange && parseResult.confidence !== 'none') {
        effectiveTimeRange = {
          start: parseResult.timeRange.start.toISOString(),
          end: parseResult.timeRange.end.toISOString(),
        };
        cleanedPrompt = parseResult.cleanedPrompt;
        meta.timeRangeParsed = true;
        meta.timeRangeDescription = parseResult.timeRange.description;
      }
    }

    // 2. Fetch AI User Profile for personalization
    const { data: aiProfile } = await supabase
      .from('ai_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 3. Count total entries for the user
    const { count: totalEntries } = await userSupabase
      .from('work_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // 4. Determine data source based on entry count and time range
    let workContext: string;

    if (useSummaries !== false && (totalEntries || 0) > SUMMARY_THRESHOLD && !effectiveTimeRange) {
      // Use periodic summaries for large datasets without specific time range
      workContext = await buildContextFromSummaries(userId, userSupabase);
      meta.usedSummaries = true;
    } else if (effectiveTimeRange) {
      // Use filtered entries for specific time range
      workContext = await buildContextFromFilteredEntries(
        userId,
        userSupabase,
        effectiveTimeRange.start,
        effectiveTimeRange.end
      );
      meta.usedSummaries = false;
    } else {
      // Use provided entries or fetch recent ones (existing behavior)
      workContext = await buildContextFromRecentEntries(workEntries, userId, userSupabase);
      meta.usedSummaries = false;
    }

    // 5. Fetch career history
    const { data: careerHistory } = await userSupabase
      .from('career_history')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    // Format career history for context
    const historyContext = careerHistory
      ?.map((role) => {
        const start = role.start_date ? new Date(role.start_date).toLocaleDateString() : 'N/A';
        const end = role.is_current ? 'Present' : (role.end_date ? new Date(role.end_date).toLocaleDateString() : 'N/A');
        return `Role: ${role.title} at ${role.company} (${start} - ${end})
${role.description ? `- Description: ${role.description}` : ''}
${role.skills ? `- Skills: ${role.skills.join(', ')}` : ''}`;
      })
      .join('\n\n') || '';

    // 6. Get AI profile context or fall back to voice analysis
    // Get current role/company from career_history (not stored in ai_user_profiles)
    const currentJob = careerHistory?.find((c: any) => c.is_current);
    const currentRole = currentJob?.title || null;
    const currentCompany = currentJob?.company || null;

    let personalizationContext: string;
    if (aiProfile) {
      // Use comprehensive AI profile with current role from career_history
      personalizationContext = formatAIProfileForPrompt(
        {
          id: aiProfile.id,
          userId: aiProfile.user_id,
          firstName: aiProfile.first_name,
          profileName: aiProfile.profile_name,
          writingStyle: aiProfile.writing_style,
          industry: aiProfile.industry,
          employmentStatus: aiProfile.employment_status,
          careerSummary: aiProfile.career_summary,
          careerGoals: aiProfile.career_goals || [],
          regularActivities: aiProfile.regular_activities || [],
          aggregatedSkills: aiProfile.aggregated_skills || {},
          skillCategories: aiProfile.skill_categories || {},
          preferences: aiProfile.preferences || {
            preferredContentLength: 'medium',
            formalityLevel: 3,
            includeMetrics: false,
          },
          lastGeneratedAt: aiProfile.last_generated_at,
          entriesAnalyzedCount: aiProfile.entries_analyzed_count || 0,
          version: aiProfile.version || 1,
        },
        { currentRole, currentCompany }
      );
    } else {
      // Fall back to basic voice analysis from provided entries
      const entriesToAnalyze = workEntries?.slice(0, 20) || [];
      const voiceProfile = analyzeUserVoice(
        entriesToAnalyze.map((entry: any) => ({
          summary: entry.redacted_summary || '',
          skills: entry.skills || [],
          achievements: entry.achievements || []
        }))
      );
      personalizationContext = formatVoiceProfileForPrompt(voiceProfile);
    }

    // 7. Build modular prompt
    const systemPrompt = getSystemPrompt(industry, type);
    const typeInstructions = getContentTypeInstructions(type);
    const formatTemplate = getFormatTemplate(type);
    const toneGuidelines = getToneGuidelines();

    const userMessage = `Using the following work history and career background, ${cleanedPrompt}

${contextDocument ? `\nCONTEXT DOCUMENT (Use this structure):\n${contextDocument}\n\n` : ''}

${personalizationContext}

CAREER HISTORY (Past Roles):
${historyContext}

WORK HISTORY:
${workContext}

---

${typeInstructions}

Expected Format:
${formatTemplate}

${toneGuidelines}

IMPORTANT: Provide ONE polished, ready-to-copy ${type.replace('_', ' ')}.
Do NOT provide multiple options, variations, or ask me to choose.
Do NOT include meta commentary like "Here's a..." or "Below is...".
Start directly with the content.`;

    // 8. Get AI provider and generate content
    const aiProvider = AIProviderFactory.getProvider();
    const response = await aiProvider.complete({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      temperature: 0.5,
      maxTokens: 8192,
    });

    return c.json({
      content: response.content,
      meta,
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return c.json(
      {
        content: '',
        error: error instanceof Error ? error.message : 'Failed to generate content',
      },
      500
    );
  }
});

// Helper functions

async function buildContextFromSummaries(
  userId: string,
  client: ReturnType<typeof createUserClient>
): Promise<string> {
  // Get most recent quarterly summaries (or monthly if no quarterly)
  const { data: summaries } = await client
    .from('periodic_summaries')
    .select('*')
    .eq('user_id', userId)
    .in('period_type', ['quarterly', 'monthly'])
    .order('period_start', { ascending: false })
    .limit(4);

  if (!summaries || summaries.length === 0) {
    return 'No work history summaries available.';
  }

  return summaries.map((s: any) => `
${s.period_type.toUpperCase()} SUMMARY (${s.period_start} to ${s.period_end}):
${s.summary_text}

Key Skills: ${s.top_skills?.join(', ') || 'N/A'}
Top Achievements: ${s.top_achievements?.join('; ') || 'N/A'}
Entries: ${s.work_entry_count}
  `.trim()).join('\n\n---\n\n');
}

async function buildContextFromFilteredEntries(
  userId: string,
  client: ReturnType<typeof createUserClient>,
  startDate?: string,
  endDate?: string
): Promise<string> {
  let query = client
    .from('work_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: entries } = await query.limit(50); // Cap at 50 for token management

  if (!entries || entries.length === 0) {
    return 'No work entries found for the specified time period.';
  }

  return formatEntries(entries);
}

async function buildContextFromRecentEntries(
  providedEntries: any[] | undefined,
  userId: string,
  client: ReturnType<typeof createUserClient>
): Promise<string> {
  const entries = providedEntries?.slice(0, 20) || [];

  if (entries.length === 0) {
    const { data } = await client
      .from('work_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return formatEntries(data || []);
  }

  return formatEntries(entries);
}

function formatEntries(entries: any[]): string {
  if (entries.length === 0) {
    return 'No work entries available.';
  }

  return entries.map((entry, i) => {
    const date = new Date(entry.created_at).toLocaleDateString();
    return `Entry ${i + 1} (${date}):
- Summary: ${entry.redacted_summary}
${entry.skills?.length ? `- Skills: ${entry.skills.join(', ')}` : ''}
${entry.achievements?.length ? `- Achievements: ${entry.achievements.join('; ')}` : ''}
${entry.category ? `- Category: ${entry.category}` : ''}`;
  }).join('\n\n');
}

export default app;
