// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { AIProviderFactory } from '../../ai/factory';
import { createUserClient } from '../../db/client';

const app = new OpenAPIHono<AuthContext>();

// Zod schemas
const ExtractTargetsRequestSchema = z.object({
  filePath: z.string().min(1),
});

const ExtractedTargetSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  type: z.enum(['kpi', 'ksb', 'sales_target', 'goal']).optional(),
  target_value: z.number().optional(),
  source_quote: z.string().optional(), // Verbatim quote from document for validation
});

const ExtractTargetsResponseSchema = z.object({
  targets: z.array(ExtractedTargetSchema),
  error: z.string().optional(),
  message: z.string().optional(),
});

// POST /api/ai/extract-targets - Extract targets from document
const extractTargetsRoute = createRoute({
  method: 'post',
  path: '/api/ai/extract-targets',
  tags: ['AI Operations'],
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: ExtractTargetsRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Targets extracted',
      content: {
        'application/json': {
          schema: ExtractTargetsResponseSchema,
        },
      },
    },
    404: {
      description: 'Document not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            message: z.string(),
            targets: z.array(z.any()),
          }),
        },
      },
    },
    422: {
      description: 'Unprocessable Entity - Document not parsed',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            message: z.string(),
            targets: z.array(z.any()),
          }),
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            message: z.string(),
            targets: z.array(z.any()),
          }),
        },
      },
    },
  },
});

app.openapi(extractTargetsRoute, async (c) => {
  try {
    const userId = c.get('userId');
    const token = c.get('token');
    const supabase = createUserClient(token);
    const { filePath } = c.req.valid('json');

    // Get document content from Supabase storage or database
    const { data: document } = await supabase
      .from('target_documents')
      .select('parsed_content, document_type')
      .eq('file_path', filePath)
      .eq('user_id', userId)
      .single();

    // Document not found
    if (!document) {
      return c.json(
        {
          targets: [],
          error: 'Document not found',
          message: `No document found at path: ${filePath}`,
        },
        404
      );
    }

    // Document found but not parsed (shouldn't happen after PDF parsing implementation)
    if (!document.parsed_content) {
      return c.json(
        {
          targets: [],
          error: 'Document not parsed',
          message: 'Document exists but has not been parsed yet. Please re-upload the document.',
        },
        422
      );
    }

    // Build system prompt for target extraction (strict anti-hallucination version)
    const systemPrompt = `You are an expert at extracting ONLY explicitly stated targets from documents.

STRICT EXTRACTION RULES - READ CAREFULLY:
1. ONLY extract targets EXPLICITLY stated in the document with clear language
2. DO NOT infer, deduce, imagine, or create targets from context
3. DO NOT extract general job responsibilities or duties
4. DO NOT extract past achievements unless explicitly stated as ongoing targets
5. DO NOT extract aspirational statements without specific measurable criteria
6. If uncertain whether something is a target, EXCLUDE IT

VALID TARGET INDICATORS (must contain one or more):
- Keywords: "Target:", "Goal:", "KPI:", "Objective:", "Achieve:", "Deliver:"
- Specific numeric values with deadlines (e.g., "£50,000 by Q2 2026")
- SMART formatted goals (Specific, Measurable, Achievable, Relevant, Time-bound)
- Clear assignment to individual (e.g., "Your target is...", "You must achieve...")

INVALID - DO NOT EXTRACT THESE:
❌ "Responsible for customer satisfaction" → Too vague, no measurable target
❌ "We aim to grow the business" → Not specific, not assigned to individual
❌ "Achieved 95% uptime last quarter" → Past achievement, not future target
❌ "Develop leadership skills" → No measurable criteria or deadline
❌ "Support the team" → General duty, not a target
❌ "Maintain high standards" → Vague, no specific metric

VALID - EXTRACT THESE:
✅ "Achieve 95% customer satisfaction score by Q2 2026" → Specific, measurable, time-bound
✅ "Increase monthly revenue to £50,000 by June 2026" → Clear numeric target with deadline
✅ "Complete 5 professional development courses in 2026" → Measurable, time-bound goal
✅ "Target: Reduce customer churn to below 5% by end of year" → Explicit target keyword + metric

VERIFICATION CHECKLIST - Before including a target, verify ALL 4:
□ Is it explicitly stated as a target/goal/KPI (not just a responsibility)?
□ Does it have a measurable component (number, percentage, deadline)?
□ Can you quote the EXACT text from the document that proves it's a target?
□ Is it assigned to the individual (not a company-wide or team goal)?

If you cannot answer YES to all 4 questions, DO NOT INCLUDE IT.

RESPONSE FORMAT (JSON):
{
  "targets": [
    {
      "title": "Exact title from document",
      "description": "Exact description from document or brief summary",
      "type": "kpi" | "ksb" | "sales_target" | "goal",
      "target_value": numeric_value_only_if_present,
      "source_quote": "REQUIRED: Verbatim quote from document proving this is a target"
    }
  ]
}

CRITICAL RULES:
- EVERY target MUST include a source_quote field with verbatim text from the document
- Return an empty array if NO explicit targets found
- It is BETTER to extract ZERO targets than to hallucinate ONE
- When in doubt, LEAVE IT OUT

Extract targets now, following these rules strictly.`;

    const userMessage = `Extract all targets from this document:\n\n${document.parsed_content}`;

    // Get AI provider - testing with Gemini
    const aiProvider = AIProviderFactory.getProvider('gemini');
    console.log('🤖 Using AI provider:', aiProvider.name, '(testing gemini-2.5-flash)');
    const response = await aiProvider.complete({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      temperature: 0.1, // Lowered from 0.3 to reduce hallucination (industry standard for extraction)
      maxTokens: 16384, // Increased for large documents with many targets
      responseFormat: 'json', // Converts to responseMimeType: 'application/json' in Gemini
    });

    // Parse JSON response - handle both markdown-wrapped and plain JSON
    let parsed;
    try {
      console.log('🔍 AI response length:', response.content.length);
      console.log('🔍 AI response (first 500 chars):', response.content.substring(0, 500));

      let content = response.content;

      // Remove markdown code fences if present
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Try to extract just the JSON object/array
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

      if (jsonMatch) {
        console.log('📝 Extracted JSON (first 500 chars):', jsonMatch[0].substring(0, 500));
        parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Parsed JSON successfully');
      } else {
        console.warn('⚠️ No JSON found in response');
        // Try direct parse as fallback
        parsed = JSON.parse(content);
      }

      console.log('📊 Extraction Stats:', {
        totalExtracted: parsed.targets?.length || 0,
        sourceLength: document.parsed_content.length,
        provider: 'gemini-2.5-flash',
        temperature: 0.1,
      });

      if (parsed.targets && Array.isArray(parsed.targets)) {
        console.log('📋 Target titles:', parsed.targets.map((t: any) => t.title));
        console.log('📋 Source quotes provided:', parsed.targets.filter((t: any) => t.source_quote).length, 'of', parsed.targets.length);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      console.log('Full response:', response.content);

      // Last resort: try to extract what we can
      console.log('🔧 Attempting partial extraction...');
      parsed = { targets: [] };
    }

    const targets = parsed.targets || [];

    // Post-processing validation: Verify extracted targets against source document
    const validatedTargets = targets.filter((target: any) => {
      // Must have source_quote field
      if (!target.source_quote) {
        console.warn(`⚠️ Target "${target.title}" excluded: No source quote provided`);
        return false;
      }

      // Verify quote exists in source document (case-insensitive)
      const quoteExists = document.parsed_content
        .toLowerCase()
        .includes(target.source_quote.toLowerCase().trim());

      if (!quoteExists) {
        console.warn(`⚠️ Target "${target.title}" excluded: Source quote not found in document`);
        console.warn(`   Quote: "${target.source_quote}"`);
        return false;
      }

      return true;
    });

    console.log(`✅ Validated ${validatedTargets.length} of ${targets.length} extracted targets`);

    const formattedTargets = validatedTargets.map((t: any) => ({
      title: t.title || 'Untitled Target',
      description: t.description,
      type: t.type || 'goal',
      target_value: t.target_value,
    }));

    console.log('📤 Sending to frontend:', formattedTargets.length, 'targets');

    return c.json({
      targets: formattedTargets,
    });
  } catch (error) {
    console.error('Extract targets error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const displayMessage = process.env.NODE_ENV === 'development' 
      ? `AI Error: ${errorMessage}` 
      : 'An unexpected error occurred during target extraction';

    return c.json(
      {
        targets: [],
        error: 'Internal Server Error',
        message: displayMessage,
      },
      500
    );
  }
});

export default app;
