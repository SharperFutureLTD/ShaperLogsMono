// @ts-nocheck - Hono OpenAPI strict typing doesn't properly handle error response unions
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { swaggerUI } from '@hono/swagger-ui';
import type { AuthContext } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limit';
import workEntriesRoutes from '../routes/work-entries';
import targetsRoutes from '../routes/targets';
import profileRoutes from '../routes/profile';
import generatedContentRoutes from '../routes/generated-content';
import workEntryTargetsRoutes from '../routes/work-entry-targets';
import aiGenerateRoutes from '../routes/ai/generate';
import aiLogChatRoutes from '../routes/ai/log-chat';
import aiSummarizeRoutes from '../routes/ai/summarize';
import aiExtractTargetsRoutes from '../routes/ai/extract-targets';
import aiVoiceToTextRoutes from '../routes/ai/voice-to-text';
import documentsUploadRoutes from '../routes/documents/upload';
import billingRoutes from '../routes/billing';
import careerRoutes from '../routes/career';

// Create OpenAPI app
export const app = new OpenAPIHono<AuthContext>();

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use('/*', cors({
  origin: (origin) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return allowedOrigins[0];
    
    // Check if origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    
    // Allow Vercel preview deployments (optional, strictly for dev/staging)
    if (process.env.NODE_ENV !== 'production' && origin.endsWith('.vercel.app')) {
      return origin;
    }

    return allowedOrigins[0]; // Fallback to first allowed origin (or deny if configured strictly)
  },
  credentials: true,
}));

// Secure headers
app.use('/*', secureHeaders());

// Rate limiter
app.use('/*', rateLimiter);

// Logger middleware
app.use('/*', logger());

// Health check endpoint (no auth required)
// @ts-expect-error - Plain object schema doesn't have proper type inference
app.openapi(
  {
    method: 'get',
    path: '/api/health',
    responses: {
      200: {
        description: 'Server is healthy',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }
);

// Register routes
app.route('/', workEntriesRoutes);
app.route('/', targetsRoutes);
app.route('/', profileRoutes);
app.route('/', generatedContentRoutes);
app.route('/', workEntryTargetsRoutes);

// Register AI routes
app.route('/', aiGenerateRoutes);
app.route('/', aiLogChatRoutes);
app.route('/', aiSummarizeRoutes);
app.route('/', aiExtractTargetsRoutes);
app.route('/', aiVoiceToTextRoutes);

// Register document routes
app.route('/', documentsUploadRoutes);

// Register billing routes
app.route('/', billingRoutes);

// Register career routes
app.route('/', careerRoutes);

// API Documentation with Swagger UI
app.get('/api/docs', swaggerUI({
  url: '/api/openapi.json',
}));

// OpenAPI JSON spec
// @ts-expect-error - components field is valid OpenAPI but not in Hono's type definitions
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Sharper-Logs API',
    version: '1.0.0',
    description: 'REST API for work logging, AI content generation, and target tracking',
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Development server',
    },
    {
      url: 'https://api.sharper-logs.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase Auth JWT token',
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: `Route ${c.req.path} not found`,
    status: 404,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    status: 500,
  }, 500);
});

export default app;
