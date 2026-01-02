import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { AIProviderFactory } from '../../ai/factory';
import { getRedactionRulesForContext } from '../../ai/prompts/redaction-rules';
import { redactJSON, detectUnredactedPII } from '../../utils/redaction';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const SummarizeRequestSchema = z.object({
  conversation: z.array(MessageSchema),
  extractedData: z.object({
    skills: z.array(z.string()).optional(),
    achievements: z.array(z.string()).optional(),
    metrics: z.record(z.unknown()).optional(),
    category: z.string().optional(),
  }).optional(),
  industry: z.string().min(1),
  targets: z.array(z.any()).optional(),
  employmentStatus: z.string().optional(),
});

const SummarizeResponseSchema = z.object({
  redactedSummary: z.string(),
  skills: z.array(z.string()),
  achievements: z.array(z.string()),
  metrics: z.record(z.unknown()),
  category: z.string().optional(),
  targetMappings: z.array(z.object({
    targetId: z.string(),
    contributionNote: z.string().optional(),
  })),
});

// POST /api/ai/summarize - Summarize conversation to work entry
const summarizeRoute = createRoute({
  method: 'post',
  path: '/api/ai/summarize',
  tags: ['AI Operations'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: SummarizeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Summary generated',
      content: {
        'application/json': {
          schema: SummarizeResponseSchema,
        },
      },
    },
  },
});

app.openapi(summarizeRoute, async (c) => {
  try {
    const { conversation, extractedData, industry, targets, employmentStatus: _employmentStatus } = c.req.valid('json');

    // Build conversation context
    const conversationText = conversation
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n');

    // Build system prompt for summarization
    const systemPrompt = `You are an AI assistant that creates professional work entry summaries for ${industry} professionals.

${getRedactionRulesForContext('summary')}

Your task is to create a comprehensive summary from a conversation about work accomplishments.

Guidelines:
1. Create a clear, professional summary (2-3 sentences) of what was accomplished
2. APPLY REDACTION RULES - Replace ALL sensitive information with placeholders
3. Extract specific skills that were used or developed
4. Identify key achievements with measurable impact (keep counts, redact amounts)
5. Note any relevant metrics or KPIs (keep metric names and counts, redact sensitive values)
6. Categorize the work appropriately for ${industry}
${targets?.length ? `7. Identify which targets this work contributes to: ${targets.map((t: any) => `${t.name} (${t.type})`).join(', ')}` : ''}

Return a JSON object with this structure:
{
  "summary": "Professional summary of work accomplished (WITH REDACTION APPLIED)",
  "skills": ["skill1", "skill2"],
  "achievements": ["achievement1", "achievement2"],
  "metrics": {"metric_name": value},
  "category": "appropriate category",
  "targetMappings": [{"targetId": "id", "contributionNote": "how it contributes"}]
}

Be specific and quantifiable where possible. Focus on impact and outcomes.
REMEMBER: Apply REDACTION to all sensitive information in the summary, achievements, and metrics.`;

    const userMessage = `Summarize this work conversation:\n\n${conversationText}`;

    // Get AI provider and generate summary
    const aiProvider = AIProviderFactory.getProvider();
    const response = await aiProvider.complete({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      temperature: 0.5,
      maxTokens: 2048,
    });

    // Parse JSON response
    let parsedResponse;
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured data from the response
        parsedResponse = {
          summary: response.content,
          skills: extractedData?.skills || [],
          achievements: extractedData?.achievements || [],
          metrics: extractedData?.metrics || {},
          category: extractedData?.category,
          targetMappings: [],
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      parsedResponse = {
        summary: response.content,
        skills: extractedData?.skills || [],
        achievements: extractedData?.achievements || [],
        metrics: extractedData?.metrics || {},
        category: extractedData?.category,
        targetMappings: [],
      };
    }

    // Build final response
    const finalResponse = {
      redactedSummary: parsedResponse.summary || response.content,
      skills: parsedResponse.skills || [],
      achievements: parsedResponse.achievements || [],
      metrics: parsedResponse.metrics || {},
      category: parsedResponse.category,
      targetMappings: parsedResponse.targetMappings || [],
    };

    // Apply post-processing redaction as fallback layer
    const safeResponse = redactJSON(finalResponse);

    // Validation: Log warnings if PII detected after redaction
    const piiIssues = detectUnredactedPII(safeResponse.redactedSummary);
    if (piiIssues.length > 0) {
      console.warn('⚠️ PII detected in summary after redaction:', piiIssues);
    }

    return c.json(safeResponse);
  } catch (error) {
    console.error('Summarize error:', error);
    return c.json(
      {
        redactedSummary: 'Failed to generate summary',
        skills: [],
        achievements: [],
        metrics: {},
        targetMappings: [],
      },
      500
    );
  }
});

export default app;
