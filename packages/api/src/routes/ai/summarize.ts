// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { AIProviderFactory } from '../../ai/factory';
import { getRedactionRulesForContext } from '../../ai/prompts/redaction-rules';
import { redactJSON, detectUnredactedPII } from '../../utils/redaction';
import { getCategoriesForUser } from '../../constants/categories';
import { validateCategory } from '../../utils/category-validator';
import { createUserClient } from '../../db/client';

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
    targetName: z.string().optional(),
    contributionNote: z.string().optional(),
    contributionValue: z.number().min(0).max(100).optional().describe('Percentage contribution (0-100)'),
    smart: SmartDataSchema.optional(),
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
    const user = c.get('user');

    // Fetch user's employment status for category options
    const supabase = createUserClient(c);
    const { data: profile } = await supabase
      .from('profiles')
      .select('employment_status')
      .eq('id', user.id)
      .single();

    const employmentStatus = profile?.employment_status || _employmentStatus || 'professional';
    const categoryList = getCategoriesForUser(employmentStatus as any);
    const categoryOptions = categoryList.join(', ');

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
6. Categorize the work using ONLY ONE of these categories: ${categoryOptions}
   - Choose the SINGLE best match from this exact list
   - Do NOT create new categories or combine categories
   - Use "General" if uncertain
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
    "smart": {
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

CRITICAL TARGET LINKING RULES (FAILURE = DATA CORRUPTION):
1. ONLY link targets if the user has targets AND explicitly discussed their progress on those targets
2. If the targets array is EMPTY, you MUST return an EMPTY targetMappings array - NO EXCEPTIONS
3. If targets exist, you may ONLY map to target IDs provided in the list above - NEVER invent or use placeholder IDs
4. NEVER assign contributionValue unless the user provided specific measurable numbers in the conversation
5. Contribution must be a POSITIVE number (> 0) representing actual progress discussed by the user
6. When in doubt, DO NOT link - empty targetMappings array is always the safe choice
7. Returning invalid target IDs or placeholder values corrupts the user interface and destroys trust
8. The user mentioning general work does NOT automatically mean it relates to any specific target`;

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
    const totalMappings = (parsedResponse.targetMappings || []).length;
    const validTargetMappings = (parsedResponse.targetMappings || []).filter((mapping: any) => {
      // Validate UUID format
      if (!mapping.targetId || !uuidRegex.test(mapping.targetId)) {
        console.warn(`[summarize] Invalid target ID format: ${mapping.targetId} - skipping`);
        return false;
      }

      // Validate that the ID exists in the provided targets list
      if (!validTargetIds.has(mapping.targetId)) {
        console.warn(`[summarize] Hallucinated target ID: ${mapping.targetId} (not in provided list) - skipping`);
        return false;
      }

      // Validate contribution value (must be present and valid)
      if (!mapping.contributionValue || typeof mapping.contributionValue !== 'number') {
        console.warn(`[summarize] Missing or invalid contributionValue for target ${mapping.targetId} - skipping`);
        return false;
      }

      // Contribution must be positive (> 0, not just >= 0)
      if (mapping.contributionValue <= 0) {
        console.warn(`[summarize] Invalid contribution value for target ${mapping.targetId}: ${mapping.contributionValue} (must be > 0) - skipping`);
        return false;
      }

      // Contribution must be reasonable (< 1000)
      if (mapping.contributionValue > 1000) {
        console.warn(`[summarize] Unrealistic contribution value for target ${mapping.targetId}: ${mapping.contributionValue} (max 1000) - skipping`);
        return false;
      }

      return true;
    });

    // Log filtering results
    if (validTargetMappings.length < totalMappings) {
      console.warn(
        `[summarize] Filtered ${totalMappings - validTargetMappings.length} invalid target mappings (${validTargetMappings.length}/${totalMappings} valid)`
      );
    }

    // Create a map for O(1) target name lookup
    const targetNameMap = new Map((targets || []).map((t: any) => [t.id, t.name]));

    // Enrich valid mappings with target names and normalize smart field
    const enrichedMappings = validTargetMappings.map((mapping: any) => ({
      targetId: mapping.targetId,
      targetName: targetNameMap.get(mapping.targetId) || 'Unknown Target',
      contributionNote: mapping.contributionNote,
      contributionValue: mapping.contributionValue,
      // Support both 'smart' and 'smartData' from AI response for backwards compatibility
      smart: mapping.smart || mapping.smartData,
    }));

    // Validate category against predefined list
    const rawCategory = parsedResponse.category || extractedData?.category || 'General';
    const validatedCategory = validateCategory(rawCategory, employmentStatus as any);

    // Build final response
    const finalResponse = {
      redactedSummary: parsedResponse.summary || response.content,
      skills: parsedResponse.skills || [],
      achievements: parsedResponse.achievements || [],
      metrics: parsedResponse.metrics || {},
      category: validatedCategory,
      targetMappings: enrichedMappings,
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
