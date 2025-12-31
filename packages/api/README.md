# Sharper-Logs REST API

Production-ready REST API for the Sharper-Logs platform, providing work logging, target tracking, and multi-provider AI content generation.

## Features

- **OpenAPI 3.1 Specification** - Full Swagger documentation at `/api/docs`
- **Multi-Provider AI** - Claude, OpenAI, and Gemini support with unified interface
- **JWT Authentication** - Supabase Auth integration
- **Type-Safe** - Zod schema validation on all endpoints
- **Industry-Aware** - Tailored prompts and content types for different sectors
- **30+ REST Endpoints** - Complete CRUD operations for all resources

## Tech Stack

- **Framework**: [Hono](https://hono.dev/) - Ultra-fast edge runtime web framework
- **OpenAPI**: [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) - OpenAPI 3.1 with Zod validation
- **Database**: [Supabase](https://supabase.com/) - PostgreSQL with Row Level Security
- **AI Providers**:
  - [Anthropic Claude](https://www.anthropic.com/) - Claude 3.5 Sonnet
  - [OpenAI](https://openai.com/) - GPT-4o
  - [Google Gemini](https://ai.google.dev/) - Gemini 1.5 Pro
- **Validation**: [Zod](https://zod.dev/) - TypeScript-first schema validation
- **Runtime**: Node.js 18+

## Installation

```bash
# From the monorepo root
npm install

# Or from this package
cd packages/api
npm install
```

## Environment Variables

Create a `.env` file in `packages/api/` with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AI Provider API Keys (configure at least one)
ANTHROPIC_API_KEY=your-anthropic-api-key-here
OPENAI_API_KEY=your-openai-api-key-here
GOOGLE_AI_API_KEY=your-google-ai-api-key-here

# Default AI Provider (claude | openai | gemini)
DEFAULT_AI_PROVIDER=claude

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

See `.env.example` for a complete template.

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run type-check
```

### Generate OpenAPI Spec
```bash
npm run openapi
```

The server will start on `http://localhost:3001` with:
- API Documentation: http://localhost:3001/api/docs
- OpenAPI Spec: http://localhost:3001/api/openapi.json
- Health Check: http://localhost:3001/api/health

## API Endpoints

### Health & Documentation
- `GET /api/health` - Health check (no auth required)
- `GET /api/docs` - Interactive Swagger UI
- `GET /api/openapi.json` - OpenAPI 3.1 specification

### Work Entries
- `GET /api/work-entries` - List all work entries
- `POST /api/work-entries` - Create a work entry
- `GET /api/work-entries/:id` - Get single work entry
- `DELETE /api/work-entries/:id` - Delete work entry

### Targets
- `GET /api/targets` - List all targets (query: `is_active=true`)
- `POST /api/targets` - Create a target
- `PUT /api/targets/:id` - Update target
- `PATCH /api/targets/:id/progress` - Increment progress
- `PATCH /api/targets/:id/soft-delete` - Archive target
- `PATCH /api/targets/:id/restore` - Restore archived target
- `GET /api/targets/:targetId/evidence` - Get evidence for target

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `PATCH /api/profile/industry` - Update industry
- `PATCH /api/profile/employment-status` - Update employment status
- `PATCH /api/profile/study-field` - Update study field
- `PATCH /api/profile/onboarding` - Complete onboarding

### Generated Content
- `GET /api/generated-content` - List all generated content
- `POST /api/generated-content` - Save generated content
- `DELETE /api/generated-content/:id` - Delete content

### Work Entry Targets
- `POST /api/work-entry-targets` - Link work entry to target

### AI Operations
- `POST /api/ai/generate` - Generate content from work history
- `POST /api/ai/log-chat` - Conversational work logging
- `POST /api/ai/summarize` - Summarize conversation to structured entry
- `POST /api/ai/extract-targets` - Extract KPIs/KSBs from documents

## Multi-Provider AI Configuration

The API supports three AI providers with automatic fallback:

### Provider Selection
Set the default provider via environment variable:
```env
DEFAULT_AI_PROVIDER=claude    # claude | openai | gemini
```

### Provider Comparison

| Provider | Model | Best For | Token Limit |
|----------|-------|----------|-------------|
| **Claude** | claude-3.5-sonnet-20241022 | Professional writing, resumes, brag docs | 200K context |
| **OpenAI** | gpt-4o | Creative content, blogs, LinkedIn posts | 128K context |
| **Gemini** | gemini-1.5-pro | Fast summaries, document parsing, high-volume | 2M context |

### Provider Features

**Claude (Anthropic)**
- Superior at professional document generation
- Excellent instruction following
- Strong at structured output
- Best for resume, performance reviews, technical writing

**OpenAI GPT-4o**
- Strong creative writing capabilities
- Great for social media content
- Multimodal support (images)
- Best for blogs, LinkedIn posts, marketing copy

**Google Gemini**
- Massive context window (2M tokens)
- Fast inference
- Cost-effective for high-volume
- Best for document parsing, batch processing, summaries

### Usage in Code

The AI provider is abstracted via `AIProviderFactory`:

```typescript
import { AIProviderFactory } from './ai/factory';

// Uses DEFAULT_AI_PROVIDER from env
const provider = AIProviderFactory.getProvider();

// Or specify explicitly
const claude = AIProviderFactory.getProvider('claude');

// Make completion request
const response = await provider.complete({
  messages: [{ role: 'user', content: 'Generate a resume...' }],
  systemPrompt: 'You are a professional resume writer...',
  temperature: 0.7,
  maxTokens: 2048,
});
```

## Authentication

All endpoints except `/api/health` and `/api/docs` require JWT authentication.

### Request Headers
```http
Authorization: Bearer <supabase-jwt-token>
```

### Getting a Token
Tokens are issued by Supabase Auth. The frontend handles authentication and provides the token.

Example using curl:
```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:3001/api/work-entries
```

### Authentication Middleware

The API uses two middleware functions:
- `authMiddleware` - Requires valid JWT (401 if missing/invalid)
- `optionalAuthMiddleware` - Validates JWT if present, continues if not

User context is available in route handlers:
```typescript
const userId = c.get('userId');  // string
const user = c.get('user');      // Supabase User object
```

## Testing with Swagger UI

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Open Swagger UI**: http://localhost:3001/api/docs

3. **Authenticate**:
   - Click "Authorize" button
   - Enter: `Bearer <your-supabase-jwt-token>`
   - Click "Authorize"

4. **Test Endpoints**:
   - Click any endpoint to expand
   - Click "Try it out"
   - Fill in request body (if required)
   - Click "Execute"
   - View response

### Example Requests

**Create Work Entry**:
```json
POST /api/work-entries
{
  "redacted_summary": "Implemented new authentication system",
  "encrypted_original": "encrypted-content-here",
  "skills": ["TypeScript", "Authentication", "Security"],
  "achievements": ["Reduced login time by 50%"],
  "metrics": {
    "users_migrated": 1000,
    "performance_improvement": 50
  },
  "category": "Engineering"
}
```

**Create Target**:
```json
POST /api/targets
{
  "name": "Close 10 new deals",
  "description": "Q1 sales target",
  "type": "sales_target",
  "target_value": 10,
  "current_value": 0,
  "deadline": "2024-03-31T23:59:59Z"
}
```

**Generate Content**:
```json
POST /api/ai/generate
{
  "prompt": "Create a professional resume summary",
  "type": "resume",
  "industry": "Software Engineering",
  "workEntries": [
    {
      "redacted_summary": "Built REST API with 30+ endpoints",
      "skills": ["Node.js", "TypeScript", "API Design"],
      "achievements": ["Reduced response time by 60%"]
    }
  ]
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "details": {},
  "status": 400
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid JWT)
- `404` - Not Found
- `500` - Internal Server Error

### Validation Errors
Zod validation errors include detailed field information:
```json
{
  "error": "Validation error",
  "details": {
    "issues": [
      {
        "path": ["redacted_summary"],
        "message": "Required"
      }
    ]
  },
  "status": 400
}
```

## Project Structure

```
packages/api/
├── src/
│   ├── index.ts              # Server entry point
│   ├── server/
│   │   └── app.ts            # Hono app with route registration
│   ├── routes/
│   │   ├── work-entries.ts   # Work entries CRUD
│   │   ├── targets.ts        # Targets CRUD
│   │   ├── profile.ts        # Profile management
│   │   ├── generated-content.ts
│   │   ├── work-entry-targets.ts
│   │   └── ai/
│   │       ├── generate.ts   # Content generation
│   │       ├── log-chat.ts   # Conversational logging
│   │       ├── summarize.ts  # Conversation to entry
│   │       └── extract-targets.ts
│   ├── middleware/
│   │   └── auth.ts           # JWT authentication
│   ├── db/
│   │   └── client.ts         # Supabase client
│   ├── ai/
│   │   ├── types.ts          # AI interfaces
│   │   ├── factory.ts        # Provider factory
│   │   └── providers/
│   │       ├── claude.ts     # Anthropic implementation
│   │       ├── openai.ts     # OpenAI implementation
│   │       └── gemini.ts     # Google implementation
│   └── types/
│       └── database.ts       # Database types
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Database Schema

The API connects to Supabase PostgreSQL with these tables:

- `work_entries` - User work logs with encrypted originals
- `targets` - Goals, KPIs, KSBs, sales targets
- `profiles` - User profiles with industry/employment status
- `generated_content` - AI-generated documents
- `work_entry_targets` - Links work entries to targets (with SMART data)
- `target_documents` - Uploaded documents for target extraction
- `log_conversations` - Conversation history for logging

All tables use Row Level Security (RLS). The API uses the service role key to bypass RLS and implements authorization in application code.

## Development

### Adding New Endpoints

1. Create route file in `src/routes/`:
```typescript
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';

const app = new OpenAPIHono();

const myRoute = createRoute({
  method: 'post',
  path: '/api/my-endpoint',
  middleware: [authMiddleware] as any,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            field: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Success response',
      content: {
        'application/json': {
          schema: z.object({
            result: z.string(),
          }),
        },
      },
    },
  },
});

app.openapi(myRoute, async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  // Implementation here
  return c.json({ result: 'success' });
});

export default app;
```

2. Register route in `src/server/app.ts`:
```typescript
import myRoute from '../routes/my-route';
app.route('/', myRoute);
```

### Adding New AI Providers

1. Implement `IAIProvider` interface in `src/ai/providers/`:
```typescript
export class MyProvider implements IAIProvider {
  public readonly name = 'myprovider' as const;

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // Implementation
  }
}
```

2. Add to factory in `src/ai/factory.ts`:
```typescript
case 'myprovider':
  instance = new MyProvider({ apiKey: process.env.MY_PROVIDER_KEY });
  break;
```

## Deployment

### Environment Setup
1. Set all required environment variables in production
2. Ensure `NODE_ENV=production`
3. Configure CORS for production frontend domains

### Build & Deploy
```bash
npm run build
NODE_ENV=production npm start
```

### Recommended Hosting
- **Vercel** - Edge runtime compatible
- **Railway** - Simple deployment
- **Fly.io** - Global edge deployment
- **AWS Lambda** - Serverless with API Gateway

## Security Considerations

1. **JWT Validation** - All protected routes validate Supabase JWT tokens
2. **CORS** - Configured for specific frontend origins only
3. **Rate Limiting** - TODO: Add rate limiting middleware
4. **Input Validation** - All inputs validated with Zod schemas
5. **SQL Injection** - Protected by Supabase client parameterization
6. **Secrets** - Never commit `.env` files, use environment variables

## Performance

- **Cold Start**: ~100ms (Hono is optimized for edge)
- **Average Response**: ~50ms (database queries), ~2-5s (AI completions)
- **Concurrent Requests**: Supports high concurrency (Node.js event loop)
- **Caching**: AI provider instances cached (singleton pattern)

## Troubleshooting

### Server won't start
```bash
# Check environment variables
cat .env

# Verify Supabase connection
curl https://your-project.supabase.co/rest/v1/

# Check port availability
lsof -i :3001
```

### AI requests failing
```bash
# Verify API keys are set
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
echo $GOOGLE_AI_API_KEY

# Check provider selection
echo $DEFAULT_AI_PROVIDER
```

### Authentication errors
- Ensure JWT token is valid (not expired)
- Verify `SUPABASE_URL` matches frontend
- Check token format: `Bearer <token>`

## License

Part of the Sharper-Logs monorepo. See root LICENSE file.

## Support

For issues and questions:
- Open an issue in the main repository
- Check Swagger UI for interactive API documentation
- Review the OpenAPI spec for endpoint details
