import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { AIProviderFactory } from '../../ai/factory';
import { createUserClient } from '../../db/client';
import {
  getSystemPrompt,
  getContentTypeInstructions,
  getFormatTemplate,
  getToneGuidelines,
  analyzeUserVoice,
  formatVoiceProfileForPrompt,
} from '../../ai/prompts';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const GenerateRequestSchema = z.object({
  prompt: z.string().min(1),
  type: z.string().min(1),
  workEntries: z.array(z.any()).optional(),
  industry: z.string().min(1),
  contextDocument: z.string().optional().describe('Parsed text content from an uploaded file to guide generation structure'),
});

const GenerateResponseSchema = z.object({
  content: z.string(),
  error: z.string().optional(),
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
    const { prompt, type, workEntries, industry, contextDocument } = c.req.valid('json');

    // Fetch career history
    const supabase = createUserClient(token);
    const { data: careerHistory } = await supabase
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

    // Optimization: Limit to most recent 20 entries to manage token usage
    const recentEntries = workEntries?.slice(0, 20) || [];

    // Format work history for context
    const workHistory = recentEntries
      .map((entry: any, index: number) => {
        const date = new Date(entry.created_at).toLocaleDateString();
        return `Entry ${index + 1} (${date}):
- Summary: ${entry.redacted_summary}
${entry.skills?.length ? `- Skills: ${entry.skills.join(', ')}` : ''}
${entry.achievements?.length ? `- Achievements: ${entry.achievements.join('; ')}` : ''}
${entry.category ? `- Category: ${entry.category}` : ''}`;
      })
      .join('\n\n') || 'No recent work history provided.';

    // Analyze user's writing voice from their work entries
    const voiceProfile = analyzeUserVoice(
      recentEntries.map((entry: any) => ({
        summary: entry.redacted_summary || '',
        skills: entry.skills || [],
        achievements: entry.achievements || []
      }))
    );

    // Build modular, human-sounding prompt
    const systemPrompt = getSystemPrompt(industry, type);
    const typeInstructions = getContentTypeInstructions(type);
    const formatTemplate = getFormatTemplate(type);
    const toneGuidelines = getToneGuidelines();
    const voiceContext = formatVoiceProfileForPrompt(voiceProfile);

    const userMessage = `Using the following work history and career background, ${prompt}

${contextDocument ? `\nCONTEXT DOCUMENT (Use this structure):\n${contextDocument}\n\n` : ''}

CAREER HISTORY (Past Roles):
${historyContext}

RECENT WORK LOGS (Current Role):
${workHistory}

---

${typeInstructions}

${voiceContext}

Expected Format:
${formatTemplate}

${toneGuidelines}

IMPORTANT: Provide ONE polished, ready-to-copy ${type.replace('_', ' ')}.
Do NOT provide multiple options, variations, or ask me to choose.
Do NOT include meta commentary like "Here's a..." or "Below is...".
Start directly with the content.`;

    // Get AI provider and generate content
    const aiProvider = AIProviderFactory.getProvider();
    const response = await aiProvider.complete({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      temperature: 0.5, // Lower temperature for more consistent, less AI-sounding output
      maxTokens: 8192,
    });

    return c.json({
      content: response.content,
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

export default app;
