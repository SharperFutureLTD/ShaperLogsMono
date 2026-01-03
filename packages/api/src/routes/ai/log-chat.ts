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
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            shouldSummarize: z.boolean(),
          }),
        },
      },
    },
  },
});

app.openapi(logChatRoute, async (c) => {
  try {
    const { messages, exchangeCount = 0, industry, targets } = c.req.valid('json');

    const maxExchanges = 5;
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

IMPORTANT DATA EXTRACTION: Actively extract structured data from the conversation:
1. Skills: Technical skills, tools, technologies, or soft skills mentioned
2. Achievements: Concrete accomplishments or completed tasks
3. Metrics: Quantifiable results (numbers, percentages, timeframes)
4. Category: The type of work (e.g., "development", "design", "management", "sales")

Extract this data from BOTH the user's messages AND your own responses. Look for:
- Skills: "used React", "applied leadership", "utilized SQL"
- Achievements: "completed the feature", "launched the project", "resolved the bug"
- Metrics: "improved by 20%", "saved 5 hours", "processed 1000 requests"

Return the extracted data even during the conversation (not just at summarization).

Your response MUST be a JSON object with this structure:
{
  "message": "Your conversational response to the user",
  "extractedData": {
    "skills": ["skill1", "skill2"],
    "achievements": ["achievement1", "achievement2"],
    "metrics": {
      "metric_name": value,
      "another_metric": "description"
    },
    "category": "work_category"
  }
}

IMPORTANT: Apply REDACTION in real-time as you respond. Don't echo back sensitive information.`;

    // Get AI provider and generate response
    const aiProvider = AIProviderFactory.getProvider();
    const response = await aiProvider.complete({
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Try to parse extracted data from AI response
    let extractedData = {
      skills: [] as string[],
      achievements: [] as string[],
      metrics: {} as Record<string, unknown>,
      category: 'general',
    };
    let aiMessage = response.content;

    try {
      // Helper to clean and parse JSON from AI response
      const cleanAndParseJSON = (text: string) => {
        // 1. Try to find JSON in markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          return JSON.parse(jsonMatch[1]);
        }
        
        // 2. Try to find the first '{' and last '}'
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
          return JSON.parse(text.substring(firstOpen, lastClose + 1));
        }
        
        // 3. Try parsing the whole string
        return JSON.parse(text);
      };

      const aiResponse = cleanAndParseJSON(response.content);
      
      if (aiResponse) {
        if (aiResponse.extractedData) {
          extractedData = {
            skills: Array.isArray(aiResponse.extractedData.skills) ? aiResponse.extractedData.skills : [],
            achievements: Array.isArray(aiResponse.extractedData.achievements) ? aiResponse.extractedData.achievements : [],
            metrics: typeof aiResponse.extractedData.metrics === 'object' ? aiResponse.extractedData.metrics : {},
            category: typeof aiResponse.extractedData.category === 'string' ? aiResponse.extractedData.category : 'general',
          };
        }
        // Use the message field if present
        if (aiResponse.message) {
          aiMessage = aiResponse.message;
        }
      }
    } catch (e) {
      // If not valid JSON, treat entire response as message (existing behavior)
      console.log('AI response not JSON/parseable, using as plain message');
    }

    // Apply post-processing redaction to AI response
    const safeMessage = redactPII(aiMessage);

    return c.json({
      message: safeMessage,
      extractedData,
      shouldSummarize,
    });
  } catch (error) {
    console.error('Log chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // In development, show the actual error message (e.g., missing API key)
    const displayMessage = process.env.NODE_ENV === 'development' 
      ? `AI Error: ${errorMessage}` 
      : "I'm having trouble right now. Could you try again?";

    return c.json(
      {
        message: displayMessage,
        shouldSummarize: false,
      },
      500
    );
  }
});

export default app;
