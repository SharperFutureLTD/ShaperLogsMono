import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { AIProviderFactory } from '../../ai/factory';
import { getRedactionRulesForContext } from '../../ai/prompts/redaction-rules';
import { redactPII } from '../../utils/redaction';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const LogChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  exchangeCount: z.number().optional(),
  industry: z.string().min(1),
  targets: z.array(z.any()).optional(),
});

const LogChatResponseSchema = z.object({
  message: z.string(),
  extractedData: z.object({
    skills: z.array(z.string()).optional(),
    achievements: z.array(z.string()).optional(),
    metrics: z.record(z.unknown()).optional(),
    category: z.string().optional(),
  }).optional(),
  shouldSummarize: z.boolean(),
});

// POST /api/ai/log-chat - Conversational work logging
const logChatRoute = createRoute({
  method: 'post',
  path: '/api/ai/log-chat',
  tags: ['AI Operations'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: LogChatRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Chat response',
      content: {
        'application/json': {
          schema: LogChatResponseSchema,
        },
      },
    },
  },
});

app.openapi(logChatRoute, async (c) => {
  try {
    const { messages, exchangeCount = 0, industry, targets } = c.req.valid('json');

    const maxExchanges = 3;
    const shouldSummarize = exchangeCount >= maxExchanges;

    // Build system prompt for conversational logging
    const systemPrompt = `You are a helpful AI assistant for logging work accomplishments in the ${industry} industry.

${getRedactionRulesForContext('chat')}

Your role:
- Ask friendly, conversational questions to help users document their work
- REDACT any sensitive information the user shares in your responses
- Extract key details: tasks completed, skills used, achievements, metrics
- Keep the conversation natural and encouraging
- After ${maxExchanges} exchanges, you'll help create a summary

Guidelines:
- Ask one focused question at a time
- Be specific about what information you need
- Acknowledge and validate user responses
- Look for quantifiable metrics and concrete achievements
- If user mentions PII (names, companies, amounts), acknowledge but use placeholders in your response
${targets?.length ? `- Reference these active targets when relevant: ${targets.map((t: any) => t.name).join(', ')}` : ''}

Current exchange: ${exchangeCount + 1} of ${maxExchanges}
${shouldSummarize ? '\nThis is the final exchange. Acknowledge their response and let them know you\'re ready to create a summary.' : ''}

IMPORTANT: Apply REDACTION in real-time as you respond. Don't echo back sensitive information.`;

    // Get AI provider and generate response
    const aiProvider = AIProviderFactory.getProvider();
    const response = await aiProvider.complete({
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      systemPrompt,
      temperature: 0.8,
      maxTokens: 500,
    });

    // Extract structured data from the conversation
    let extractedData = undefined;

    if (messages.length > 0) {
      const _userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');

      // Simple extraction (in production, you might want a separate AI call for this)
      extractedData = {
        skills: [],
        achievements: [],
        metrics: {},
        category: undefined,
      };
    }

    // Apply post-processing redaction to AI response
    const safeMessage = redactPII(response.content);

    return c.json({
      message: safeMessage,
      extractedData,
      shouldSummarize,
    });
  } catch (error) {
    console.error('Log chat error:', error);
    return c.json(
      {
        message: "I'm having trouble right now. Could you try again?",
        shouldSummarize: false,
      },
      500
    );
  }
});

export default app;
