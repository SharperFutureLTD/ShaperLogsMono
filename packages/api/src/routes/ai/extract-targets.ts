import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { AIProviderFactory } from '../../ai/factory';
import { supabase } from '../../db/client';

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
  },
});

app.openapi(extractTargetsRoute, async (c) => {
  try {
    const userId = c.get('userId');
    const { filePath } = c.req.valid('json');

    // Get document content from Supabase storage or database
    const { data: document } = await supabase
      .from('target_documents')
      .select('parsed_content, document_type')
      .eq('file_path', filePath)
      .eq('user_id', userId)
      .single();

    if (!document || !document.parsed_content) {
      return c.json(
        {
          targets: [],
        },
        404
      );
    }

    // Build system prompt for target extraction
    const systemPrompt = `You are an AI assistant that extracts goals, KPIs, and targets from documents.

Analyze the provided document and extract all:
- Key Performance Indicators (KPIs)
- Knowledge, Skills, and Behaviors (KSBs) for apprenticeships
- Sales targets or quotas
- Goals and objectives

For each target, identify:
1. Title/name of the target
2. Description or context
3. Type (kpi, ksb, sales_target, or goal)
4. Target value (if numeric)

Return a JSON array of targets with this structure:
[
  {
    "title": "Target name",
    "description": "Description or context",
    "type": "kpi|ksb|sales_target|goal",
    "target_value": 100
  }
]

Be thorough but only extract explicit targets. Don't infer targets that aren't clearly stated.`;

    const userMessage = `Extract all targets from this document:\n\n${document.parsed_content}`;

    // Get AI provider and extract targets
    const aiProvider = AIProviderFactory.getProvider();
    const response = await aiProvider.complete({
      messages: [
        { role: 'user', content: userMessage },
      ],
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
    });

    // Parse JSON response
    let targets: any[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        targets = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse targets:', parseError);
    }

    return c.json({
      targets: targets.map(t => ({
        title: t.title || 'Untitled Target',
        description: t.description,
        type: t.type || 'goal',
        target_value: t.target_value,
      })),
    });
  } catch (error) {
    console.error('Extract targets error:', error);
    return c.json(
      {
        targets: [],
      },
      500
    );
  }
});

export default app;
