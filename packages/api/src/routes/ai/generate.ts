import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { AIProviderFactory } from '../../ai/factory';

import { createUserClient } from '../../db/client';

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
    const isTruncated = (workEntries?.length || 0) > 20;

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

    // Build industry-specific system prompt
    const systemPrompt = `You are a professional ${industry} content writer and career advisor.
Your task is to help create ${type} content that is:
- Professional and industry-appropriate
- Specific and quantifiable where possible
- Achievement-focused and impact-oriented
- Tailored to ${industry} industry standards

Guidelines:
- Use active voice and strong action verbs
- Quantify achievements with metrics when available
- Focus on impact and outcomes, not just tasks
- Match the tone and style expected for ${type} documents
- Be concise but comprehensive
${contextDocument ? `- IMPORTANT: Strictly follow the structure and format provided in the "Context Document" section below.` : ''}`;

    const userMessage = `Using the following work history and career background, ${prompt}

${contextDocument ? `\n\nCONTEXT DOCUMENT (Use this structure):\n${contextDocument}\n` : ''}

CAREER HISTORY (Past Roles):
${historyContext}

RECENT WORK LOGS (Current Role):
${workHistory}

Please generate the ${type} content.`;

    // Get AI provider and generate content
    const aiProvider = AIProviderFactory.getProvider();
    const response = await aiProvider.complete({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      temperature: 0.7,
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
