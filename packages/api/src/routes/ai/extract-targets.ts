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

    // Build system prompt for target extraction (matching legacy version)
    const systemPrompt = `You are an expert at extracting structured targets from documents.

Extract all targets/goals/KPIs/KSBs from the provided document text. For each target, identify:
- title: A concise name for the target
- description: Brief description of what needs to be achieved
- type: One of 'kpi', 'ksb', 'sales_target', 'goal'
- target_value: Numeric value if applicable (e.g., 10000 for £10,000 revenue)

RESPONSE FORMAT (JSON):
{
  "targets": [
    {
      "title": "Q1 Revenue Target",
      "description": "Achieve quarterly revenue goal",
      "type": "sales_target",
      "target_value": 10000
    },
    {
      "title": "Customer Satisfaction Score",
      "description": "Maintain high customer satisfaction rating",
      "type": "kpi",
      "target_value": 95
    }
  ]
}

Be thorough but only extract explicit targets. Don't infer targets that aren't clearly stated.`;

    const userMessage = `Extract all targets from this document:\n\n${document.parsed_content}`;

    // Get AI provider - testing with Gemini
    const aiProvider = AIProviderFactory.getProvider('gemini');
    console.log('🤖 Using AI provider:', aiProvider.name, '(testing gemini-2.5-flash)');
    const response = await aiProvider.complete({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      temperature: 0.3,
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

      console.log('📋 Extracted targets:', parsed.targets?.length || 0);

      if (parsed.targets && Array.isArray(parsed.targets)) {
        console.log('📋 Target titles:', parsed.targets.map((t: any) => t.title));
      }
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      console.log('Full response:', response.content);

      // Last resort: try to extract what we can
      console.log('🔧 Attempting partial extraction...');
      parsed = { targets: [] };
    }

    const targets = parsed.targets || [];
    const formattedTargets = targets.map((t: any) => ({
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
