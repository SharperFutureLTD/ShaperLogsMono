import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { AIProviderFactory } from '../../ai/factory';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const GenerateRequestSchema = z.object({
  prompt: z.string().min(1),
  type: z.string().min(1),
  workEntries: z.array(z.any()).optional(),
  industry: z.string().min(1),
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
    const { prompt, type, workEntries, industry } = c.req.valid('json');

    // Format work history for context
    const workHistory = workEntries
      ?.map((entry: any, index: number) => {
        const date = new Date(entry.created_at).toLocaleDateString();
        return `Entry ${index + 1} (${date}):
- Summary: ${entry.redacted_summary}
${entry.skills?.length ? `- Skills: ${entry.skills.join(', ')}` : ''}
${entry.achievements?.length ? `- Achievements: ${entry.achievements.join('; ')}` : ''}
${entry.category ? `- Category: ${entry.category}` : ''}`;
      })
      .join('\n\n') || 'No work history provided.';

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
- Be concise but comprehensive`;

    const userMessage = `Using the following work history, ${prompt}

Work History:
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
      maxTokens: 4096,
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
