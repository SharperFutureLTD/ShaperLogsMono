import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { AIProviderFactory } from '../../ai/factory';
import { getRedactionRulesForContext } from '../../ai/prompts/redaction-rules';
import { redactPII } from '../../utils/redaction';
import { getCategoriesForUser } from '../../constants/categories';
import { validateCategory } from '../../utils/category-validator';
import { createUserClient } from '../../db/client';

const app = new OpenAPIHono<AuthContext>();

// Helper to sanitize AI message - removes any markdown code blocks or embedded JSON
const sanitizeMessage = (text: string): string => {
  // Remove markdown code blocks (```json...``` or ```...```)
  let cleaned = text.replace(/```[\s\S]*?```/g, '').trim();

  // Remove any JSON-like objects that contain "message" key
  cleaned = cleaned.replace(/\{[\s\S]*?"message"[\s\S]*?\}/g, '').trim();

  return cleaned;
};

// Helper to check if text contains technical formatting that shouldn't be shown to users
const containsTechnicalFormatting = (text: string): boolean => {
  return (
    text.includes('```') ||
    text.includes('{"') ||
    text.includes('{ "') ||
    /\{\s*"message"\s*:/.test(text)
  );
};

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
    const user = c.get('user');

    const maxExchanges = 5;
    const shouldSummarize = exchangeCount >= maxExchanges;

    // Fetch user's employment status for category options
    const supabase = createUserClient(c);
    const { data: profile } = await supabase
      .from('profiles')
      .select('employment_status')
      .eq('id', user.id)
      .single();

    const employmentStatus = profile?.employment_status || 'professional';
    const categoryList = getCategoriesForUser(employmentStatus as any);
    const categories = categoryList.join('|');

    // Helper: Get industry-specific guidance (restored from legacy)
    const getIndustryGuidance = (ind: string): string => {
      const industryGuidance: Record<string, string> = {
        sales: `Focus on: revenue numbers, deals closed, pipeline value, client relationships, quota attainment, negotiation wins.
Common skills: CRM tools (Salesforce, HubSpot), prospecting, closing, account management, cold calling.`,
        engineering: `Focus on: projects completed, systems designed, efficiency improvements, safety metrics, cost savings.
Common skills: CAD software, project management, technical specifications, compliance, testing.`,
        software: `Focus on: features shipped, bugs fixed, code reviews, deployments, system architecture, performance improvements.
Common skills: programming languages, frameworks, DevOps, testing, agile methodologies, APIs.`,
        research: `Focus on: experiments conducted, publications, patents, discoveries, grant funding, data analysis.
Common skills: research methodology, statistical analysis, lab techniques, scientific writing, peer review.`,
        education: `Focus on: students taught, curriculum developed, learning outcomes, mentoring, workshops delivered.
Common skills: lesson planning, assessment design, classroom management, educational technology, differentiated instruction.`,
        marketing: `Focus on: campaigns launched, leads generated, conversion rates, brand awareness, content created, ROI metrics.
Common skills: SEO/SEM, social media, analytics, content creation, marketing automation, branding.`,
        finance: `Focus on: portfolios managed, returns achieved, audits completed, forecasts accuracy, cost reductions.
Common skills: financial modeling, analysis, reporting, compliance, risk assessment, Excel/SQL.`,
        healthcare: `Focus on: patients treated, procedures performed, outcomes improved, certifications maintained, protocols developed.
Common skills: patient care, medical records, clinical procedures, compliance, team collaboration.`,
        operations: `Focus on: processes optimized, efficiency gains, cost savings, delivery metrics, projects managed.
Common skills: project management, logistics, supply chain, process improvement, vendor management.`,
        general: `Focus on: accomplishments, outcomes, skills demonstrated, metrics achieved, impact made.
Common skills: communication, problem-solving, teamwork, time management, adaptability.`
      };
      return (industryGuidance[ind] || industryGuidance.general) as string;
    };

    // Helper: Build detailed targets context with progress (restored from legacy)
    const getTargetsContext = (tgts: any[]): string => {
      if (!tgts || tgts.length === 0) return '';

      let targetsContext = `\n\nUSER'S ACTIVE TARGETS/GOALS:\n`;
      tgts.forEach((t, i) => {
        let progress = '';
        if (t.target_value && t.target_value > 0) {
          const percentage = Math.round(((t.current_value || 0) / t.target_value) * 100);
          progress = `${t.current_value || 0}/${t.target_value} ${t.unit || ''} (${percentage}%)`;
        } else if (t.current_value) {
          progress = `${t.current_value} ${t.unit || ''}`;
        } else {
          progress = 'Not started';
        }
        const deadline = t.deadline ? ` - Due: ${new Date(t.deadline).toLocaleDateString()}` : '';
        const type = t.type ? `[${t.type.toUpperCase()}]` : '';
        targetsContext += `${i + 1}. ${type} ${t.name}: ${progress}${deadline}\n`;
        if (t.description) targetsContext += `   Description: ${t.description}\n`;
      });

      targetsContext += `\nIMPORTANT TARGET-RELATED BEHAVIOR:
- When the user's work relates to any of these targets, ask specific questions about their progress
- Probe for measurable contributions (numbers, percentages, amounts)
- Ask if they hit their daily or weekly goals for relevant targets
- Connect their achievements to their active goals whenever possible
- If they mention work related to a target, ask about specific metrics/numbers`;

      return targetsContext;
    };

    // Build system prompt with legacy structure (proven to work)
    const systemPrompt = `You are a work logging assistant for a professional in the ${industry.toUpperCase()} field. Your job is to help users document their professional accomplishments through a focused, conversational exchange that digs deeper into their achievements.

INDUSTRY-SPECIFIC GUIDANCE:
${getIndustryGuidance(industry)}
${getTargetsContext(targets || [])}

${getRedactionRulesForContext('chat')}

BEHAVIOR:
- Ask focused follow-up questions to extract valuable details
- Be concise and professional - keep questions SHORT (1 sentence max, occasionally 2)
- Focus on: skills used, achievements, metrics/numbers, outcomes
- Maximum 5 exchanges total (you ask, user responds)
- After gathering enough info (typically 3-5 exchanges), set shouldSummarize to true

CRITICAL RULES - NEVER VIOLATE:
1. ONLY ask about work completed TODAY (not future plans, products, or roadmaps)
2. NEVER make up or infer information the user didn't explicitly state
3. Focus ONLY on: What did they do? What skills? What was achieved? What were the results?
4. Do NOT ask about: future features, product roadmaps, long-term plans, or hypotheticals
5. When work clearly relates to a target, ask about specific progress/contributions

Current exchange: ${exchangeCount + 1} of ${maxExchanges}
${shouldSummarize ? '\nThis is the FINAL exchange. Send a brief, friendly acknowledgment and let them know you will create their summary.' : ''}

RESPONSE FORMAT:
Return ONLY a valid JSON object. Do NOT include any text before or after the JSON.
{
  "message": "Your conversational response here",
  "shouldSummarize": true or false,
  "extractedData": {
    "skills": ["skill1", "skill2"],
    "achievements": ["achievement1"],
    "metrics": { "key": "value" },
    "category": "${categories}"
  }
}

CRITICAL RULES FOR THE "message" FIELD:
- Write ONLY plain, conversational text as if speaking to a human
- NEVER include markdown formatting (no backticks, no code blocks, no asterisks)
- NEVER include JSON syntax, curly braces, or structured data
- NEVER repeat the response structure inside the message
- Keep it natural, friendly, and brief

GOOD: "That sounds like a productive day! What specific metrics did you achieve?"
BAD: "Great work! Here is the data: \`\`\`json { ... }"

${shouldSummarize ? 'FINAL MESSAGE: Your message should be a brief acknowledgment like: "Thanks for sharing your work today! I have everything I need to create your summary."' : ''}

CATEGORY RULES:
- Choose ONLY ONE category from: ${categories}
- Use "General" if unsure

Keep questions short and targeted. Extract data progressively from each response.`;

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
        // Validate that we have a message field with actual content
        if (aiResponse.message && typeof aiResponse.message === 'string' && aiResponse.message.trim().length > 0) {
          aiMessage = aiResponse.message;
        } else {
          // Fallback: If JSON parsed but message field is missing/empty
          console.warn('[log-chat] Parsed JSON but message field missing or empty');
          aiMessage = "I'm processing your work entry. Could you provide a bit more detail?";
        }

        // Extract other fields
        if (aiResponse.extractedData) {
          // Extract and validate category
          const rawCategory = typeof aiResponse.extractedData.category === 'string'
            ? aiResponse.extractedData.category
            : 'general';
          const validatedCategory = validateCategory(rawCategory, employmentStatus as any);

          extractedData = {
            skills: Array.isArray(aiResponse.extractedData.skills) ? aiResponse.extractedData.skills : [],
            achievements: Array.isArray(aiResponse.extractedData.achievements) ? aiResponse.extractedData.achievements : [],
            metrics: typeof aiResponse.extractedData.metrics === 'object' ? aiResponse.extractedData.metrics : {},
            category: validatedCategory,
          };
        }
      } else {
        // If parsing returned null/undefined
        console.warn('[log-chat] JSON parsing returned null');

        // Sanitize and check for technical formatting
        const sanitized = sanitizeMessage(response.content);
        if (sanitized.length > 5 && !containsTechnicalFormatting(sanitized)) {
          aiMessage = sanitized;
        } else {
          aiMessage = "I'm ready to help you log your work. What did you accomplish today?";
        }
      }
    } catch (e) {
      // If parsing completely fails, sanitize and check content
      console.log('[log-chat] AI response not JSON/parseable');

      const sanitized = sanitizeMessage(response.content);
      if (sanitized.length > 5 && !containsTechnicalFormatting(sanitized)) {
        aiMessage = sanitized;
      } else {
        console.warn('[log-chat] Response contains technical formatting - using fallback message');
        aiMessage = "I'm ready to help you log your work. What did you accomplish today?";
      }
    }

    // Apply post-processing redaction to AI response
    let safeMessage = redactPII(aiMessage);

    // FINAL VALIDATION: Ensure we're not sending technical formatting to the user
    if (containsTechnicalFormatting(safeMessage)) {
      console.error('[log-chat] Technical formatting detected in final message! Attempting to sanitize.');
      const sanitized = sanitizeMessage(safeMessage);
      if (sanitized.length > 5 && !containsTechnicalFormatting(sanitized)) {
        safeMessage = sanitized;
      } else {
        console.error('[log-chat] Sanitization failed - using fallback message');
        return c.json({
          message: "I'm ready to help you log your work. What did you accomplish today?",
          extractedData,
          shouldSummarize,
        });
      }
    }

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
