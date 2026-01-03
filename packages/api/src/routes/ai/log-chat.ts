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
      return industryGuidance[ind] || industryGuidance.general;
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
- Be concise and professional - keep questions SHORT (1-2 sentences max)
- Focus on: skills used, achievements, metrics/numbers, outcomes
- If user has targets, prioritize questions that help quantify progress toward them
- Maximum 5 exchanges total (you ask, user responds)
- After gathering enough info (typically 3-5 exchanges), set shouldSummarize to true

Current exchange: ${exchangeCount + 1} of ${maxExchanges}
${shouldSummarize ? '\nThis is the final exchange. Acknowledge their response and let them know you\'re ready to create a summary.' : ''}

RESPONSE FORMAT:
Return JSON with:
{
  "message": "Your conversational response/question (PLAIN TEXT ONLY - NO JSON FORMATTING IN THIS FIELD)",
  "shouldSummarize": boolean (true when you have enough info),
  "extractedData": {
    "skills": ["skill1", "skill2"],
    "achievements": ["achievement1"],
    "metrics": { "key": "value" },
    "category": "sales|projects|learning|meetings|general"
  }
}

CRITICAL: The "message" field must contain ONLY plain, conversational text. Do NOT include JSON formatting, code blocks, or structured data in the message field itself.

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
