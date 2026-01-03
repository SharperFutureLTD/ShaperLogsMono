// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
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

const SmartDataSchema = z.object({
  specific: z.string().optional().describe('What exactly was accomplished'),
  measurable: z.string().optional().describe('Quantifiable results and metrics'),
  achievable: z.string().optional().describe('Challenges overcome and approach taken'),
  relevant: z.string().optional().describe('How it relates to the target/goal'),
  timeBound: z.string().optional().describe('When the work happened'),
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
    contributionValue: z.number().min(0).max(100).optional().describe('Percentage contribution (0-100)'),
    smartData: SmartDataSchema.optional(),
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
${targets?.length ? `7. Evaluate if this work contributes to any of the following targets.

CRITICAL TARGET LINKING RULES:
- ONLY link targets if the user EXPLICITLY mentioned them in the conversation
- If the user did NOT mention ANY targets by name, return an EMPTY array for targetMappings
- NEVER infer or assume which targets the work relates to
- NEVER link targets just because they seem related - user MUST have mentioned them
- When in doubt, DO NOT link - empty array is always safe

Available targets:
${targets.map((t: any) => `   - ID: ${t.id}, Name: ${t.name}, Type: ${t.type}`).join('\n')}` : ''}

For each RELEVANT target mapping, provide:
- targetId: The UUID of the target from the list above
- contributionNote: Brief explanation of how this work contributes
- contributionValue: Percentage (0-100) representing how much this work contributes to achieving the target
- smartData: Break down the contribution using SMART criteria:
  * specific: What exactly was accomplished that relates to this target
  * measurable: Quantifiable results and metrics achieved
  * achievable: Challenges overcome and approach taken
  * relevant: Why this work is relevant to achieving the target
  * timeBound: When the work happened (relative timeframe)

Return a JSON object with this structure:
{
  "summary": "Professional summary of work accomplished (WITH REDACTION APPLIED)",
  "skills": ["skill1", "skill2"],
  "achievements": ["achievement1", "achievement2"],
  "metrics": {"metric_name": value},
  "category": "appropriate category",
  "targetMappings": [{
    "targetId": "UUID from the list above",
    "contributionNote": "Brief explanation of contribution",
    "contributionValue": 75,
    "smartData": {
      "specific": "What exactly was accomplished",
      "measurable": "Quantifiable results achieved",
      "achievable": "Challenges overcome",
      "relevant": "Why it relates to the target",
      "timeBound": "When it happened"
    }
  }]
}

Be specific and quantifiable where possible. Focus on impact and outcomes.
REMEMBER: Apply REDACTION to all sensitive information in the summary, achievements, and metrics.

CRITICAL ANTI-HALLUCINATION RULES:
1. Do NOT hallucinate targets - only use IDs from the list above
2. If the user did NOT explicitly mention targets in the conversation, targetMappings MUST be an empty array []
3. NEVER assign contributionValue unless the user provided specific numbers
4. If there is ANY doubt about target relevance, DO NOT link it - empty array is correct
5. The user mentioning work does NOT automatically mean it links to a target`;

    const userMessage = `Summarize this work conversation:\n\n${conversationText}`;

    // Get AI provider and generate summary
    const aiProvider = AIProviderFactory.getProvider();
    const response = await aiProvider.complete({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      temperature: 0.3,
      maxTokens: 4096,
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

    // Create a set of valid target IDs for O(1) lookup
    const validTargetIds = new Set((targets || []).map((t: any) => t.id));

    // Validate and filter target mappings (ensure only valid UUIDs and contribution values)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validTargetMappings = (parsedResponse.targetMappings || []).filter((mapping: any) => {
      // Validate UUID format
      if (!mapping.targetId || !uuidRegex.test(mapping.targetId)) {
        console.warn(`Invalid target ID format: ${mapping.targetId} - skipping`);
        return false;
      }

      // Validate that the ID exists in the provided targets list
      if (!validTargetIds.has(mapping.targetId)) {
        console.warn(`Hallucinated target ID: ${mapping.targetId} (not in provided list) - skipping`);
        return false;
      }

      // Validate contribution value if present
      if (mapping.contributionValue !== undefined) {
        const isValidValue = typeof mapping.contributionValue === 'number' &&
          mapping.contributionValue >= 0 &&
          mapping.contributionValue <= 100;
        if (!isValidValue) {
          console.warn(`Invalid contributionValue for target ${mapping.targetId}: ${mapping.contributionValue} - skipping`);
          return false;
        }
      }

      return true;
    });

    // Build final response
    const finalResponse = {
      redactedSummary: parsedResponse.summary || response.content,
      skills: parsedResponse.skills || [],
      achievements: parsedResponse.achievements || [],
      metrics: parsedResponse.metrics || {},
      category: parsedResponse.category,
      targetMappings: validTargetMappings,
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
