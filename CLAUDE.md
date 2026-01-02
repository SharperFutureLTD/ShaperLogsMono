# Sharper-Logs Project Context

## 🚧 ACTIVE MIGRATION IN PROGRESS

**Status:** Phase 2 - REST API Integration with Web App
**Migration Plan:** See `/Users/ethan/.claude/plans/toasty-chasing-floyd.md`
**Current Phase:** 10 chunks over 6-8 weeks

### Migration Progress
- ✅ **Phase 1 COMPLETE:** REST API Implementation (6 waves)
  - ✅ Hono + OpenAPI server running on port 3001
  - ✅ 25+ REST endpoints with Swagger docs
  - ✅ Multi-provider AI (Claude, OpenAI, Gemini)
  - ✅ JWT authentication middleware
  - ⚠️ 4 AI endpoints incomplete (need industry context, REDACTION, PDF parsing)
  - ❌ voice-to-text endpoint missing

- 🔄 **Phase 2 IN PROGRESS:** Web App Integration
  - ❌ React Query infrastructure (Chunk 1)
  - ❌ Migrate 8 hooks from Supabase → REST API (Chunks 2-6)
  - ❌ Enhance 4 AI endpoints + add voice-to-text (Chunks 7-9)
  - ❌ Real-time updates (Chunk 10)

- 🎯 **Post-Migration:**
  - Admin backoffice at `apps/admin`
  - WebSocket real-time updates
  - Enhanced AI features

**IMPORTANT:** Work in small chunks (1-3 days each). Check plan file before starting each chunk!

**GIT WORKFLOW:** After completing each chunk, commit and push changes to GitHub. Do NOT include Claude attribution in commit messages.

---

## Project Overview
**Sharper-Logs** is a professional development logging and content generation application. It allows users to log their work achievements, skills, and metrics, and leverages **Multi-Provider AI** (Claude, OpenAI, Gemini) to transform these logs into various professional documents such as resumes, performance reviews, brag docs, and LinkedIn posts.

The application is industry-aware, providing tailored prompts and content types for sectors like Engineering, Sales, Healthcare, Education, and more.

## Directory Structure (Target Architecture)

```
Sharper-Logs/
├── apps/
│   ├── legacy-vite/          # ORIGINAL Vite app (DO NOT MODIFY during migration)
│   ├── web/                  # NEW Next.js 15 app (main user-facing application)
│   └── admin/                # Admin backoffice (placeholder, future implementation)
├── packages/
│   └── api/                  # Shared types, REST API, AI/encryption abstractions
├── turbo.json                # Turborepo configuration
└── package.json              # Root workspace
```

## Tech Stack

### Legacy (apps/legacy-vite)
- **Frontend:** React 18, Vite, TypeScript
- **Routing:** React Router DOM

### Target (apps/web)
- **Frontend:** Next.js 15, React 19, TypeScript
- **Routing:** Next.js App Router
- **Styling:** Tailwind CSS, shadcn-ui, Lucide React icons
- **State Management:** TanStack Query (React Query)
- **Backend:** Supabase (Auth, Database, Edge Functions) + Custom REST API
- **AI Integration:** Multi-provider (Claude, OpenAI, Gemini) via abstraction layer

### Shared (packages/api)
- **Server:** Hono (ultra-fast edge runtime)
- **API Docs:** OpenAPI 3.1 / Swagger UI
- **Validation:** Zod schemas
- **AI Providers:** Claude (Anthropic), OpenAI, Google Gemini
- **Encryption:** Hybrid (client-side AES-256-GCM + Supabase Vault ready)

### Infrastructure
- **Monorepo:** Turborepo with NPM workspaces
- **Build:** Turbopack (Next.js 15)
- **Deployment:** TBD (Vercel for frontend, separate API hosting)

## Architecture

### Legacy Frontend (`apps/legacy-vite/src/`)
**STATUS: DO NOT MODIFY - REFERENCE ONLY**
- **Entry:** `main.tsx` mounts `App.tsx`.
- **Routing:** `App.tsx` defines routes using `react-router-dom`. Key pages:
    - `Index.tsx`: Dashboard/Home
    - `Auth.tsx`: Login/Signup
    - `Profile.tsx`: User profile settings
    - `Targets.tsx`: Goal tracking
- **Components:** Organized in `sharperlogs/src/components/`.
    - `generate/`: Components related to AI content generation (history, input boxes).
    - `log/`: Components for logging work entries.
    - `targets/`: Components for goal/target tracking.
    - `ui/`: Reusable primitives from shadcn-ui.
- **Hooks:** Custom hooks in `sharperlogs/src/hooks/` handle logic like authentication (`useAuth.tsx`), data fetching (`useWorkEntries.ts`, `useGeneratedContent.ts`), and voice recording.
- **Types:** Strict TypeScript interfaces in `sharperlogs/src/types/` (e.g., `generate.ts` for AI prompt types, `log.ts` for work entries).

### Target Frontend (`apps/web/src/`)
**STATUS: BEING BUILT - FOLLOW MIGRATION PLAN**

- **Entry:** `app/layout.tsx` (root layout with providers)
- **Routing:** Next.js App Router with route groups:
    - `app/auth/page.tsx`: Authentication
    - `app/(authenticated)/page.tsx`: Main dashboard (Index)
    - `app/(authenticated)/profile/page.tsx`: User profile
    - `app/(authenticated)/targets/page.tsx`: Target tracking
- **Components:** Organized in `src/components/`:
    - `generate/`: AI content generation components
    - `log/`: Work logging components
    - `targets/`: Goal tracking components
    - `ui/`: 49 shadcn-ui primitives
- **Hooks:** Custom hooks in `src/hooks/`:
    - Auth, data fetching, encryption, voice recording
- **Types:** Import from `@sharper-logs/api` (shared package)
- **Lib:** Utilities, Supabase clients, encryption

### Backend (`apps/legacy-vite/supabase/`)
**STATUS: ACTIVE - USED BY BOTH APPS DURING MIGRATION**
- **Edge Functions:** Located in `sharperlogs/supabase/functions/`.
    - `ai-generate/index.ts`: The core AI logic. It receives user inputs + work history, selects an industry-specific system prompt, and calls the Claude API.
    - `extract-targets/`: Likely for parsing goals from text.
    - `voice-to-text/`: Handling audio transcription.
- **Database:** Supabase PostgreSQL. Schema migrations are in `sharperlogs/supabase/migrations/`.

## Key Features & Logic
1.  **Work Logging:** Users create "Work Entries" containing summaries, skills, achievements, and metrics.
2.  **AI Generation:**
    - The `ai-generate` function constructs a prompt based on the user's `industry` and the selected `type` (e.g., "tech_resume", "sales_report").
    - It retrieves relevant work entries, formats them, and sends them to the LLM.
    - Industry context is hardcoded in the Edge Function (`industryContext` object) to guide the style and focus of the generation.
3.  **Target Tracking:** Users can set specific targets (goals) and link their work entries to them.

## Development & Build

### Prerequisites
- Node.js & npm (or bun)
- Supabase CLI (for local backend development)

### Scripts

**Root (monorepo):**
```bash
npm run dev        # Start all apps with Turbo
npm run build      # Build all apps
npm run lint       # Lint all apps
```

**Legacy app (apps/legacy-vite):**
```bash
cd apps/legacy-vite
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # Production build
```

**New app (apps/web):**
```bash
cd apps/web
npm run dev        # Next.js with Turbopack (http://localhost:3000)
npm run build      # Next.js production build
```

**API server (packages/api):**
```bash
cd packages/api
npm run dev        # Hono dev server (http://localhost:3001)
npm run openapi    # Generate OpenAPI spec
```

### Environment Variables

**Legacy app (apps/legacy-vite/.env):**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

**New app (apps/web/.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_PROJECT_ID=
NEXT_PUBLIC_API_URL=http://localhost:3001   # REST API
```

**API server (packages/api/.env):**
```
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers (configure at least one)
ANTHROPIC_API_KEY=          # For Claude
OPENAI_API_KEY=              # For OpenAI GPT-4
GOOGLE_AI_API_KEY=           # For Gemini

# Default AI provider
DEFAULT_AI_PROVIDER=claude   # claude | openai | gemini

# Encryption
ENCRYPTION_MODE=client       # client | vault | hybrid
VAULT_ENABLED=false

# Server
PORT=3001
NODE_ENV=development
```

**Supabase Edge Functions:**
```
LOVABLE_API_KEY=             # Legacy (being phased out)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPEN_AI_KEY=                 # For voice-to-text only
```

## REST API (`packages/api/src/server/`)
**STATUS: BEING BUILT - FOLLOW MIGRATION PLAN**

- **Framework:** Hono (edge-ready, OpenAPI support)
- **Documentation:** Swagger UI at `/api/docs`
- **Endpoints:**
    - `/api/auth/*` - Authentication
    - `/api/profile` - User profile
    - `/api/work-entries` - Work entry CRUD
    - `/api/targets` - Target CRUD
    - `/api/ai/generate` - Content generation
    - `/api/ai/log-chat` - Conversational logging
    - `/api/ai/summarize` - Conversation summarization
- **Security:**
    - JWT validation
    - Rate limiting
    - Helmet (CSP, security headers)
    - Audit logging

## AI Configuration

### Multi-Provider Support (`packages/api/src/ai/`)
**STATUS: BEING BUILT - FOLLOW MIGRATION PLAN**

The application supports multiple AI providers via an abstraction layer:

**Providers:**
- **Claude (Anthropic):** Best for resumes, brag docs, professional writing
- **OpenAI GPT-4:** Best for creative content, blogs, LinkedIn posts
- **Google Gemini:** Best for fast summaries, document parsing, high-volume operations

**Configuration:** Set via environment variables
```
DEFAULT_AI_PROVIDER=claude    # claude | openai | gemini
```

**Provider Selection:**
- Global default configurable
- Per-function override available
- Per-user preference (future enhancement)
- Fallback chain if primary fails

### Prompts (`packages/api/src/ai/prompts/`)
Prompts are structured with:
1. **System Prompt:** Defines persona and industry-specific instructions
2. **Context:** User's work history formatted with dates
3. **User Prompt:** Specific request

All prompts are provider-agnostic (abstracted interface handles provider-specific formatting).

## Encryption & Security

### Enterprise-Grade Encryption
**STATUS: BEING BUILT - FOLLOW MIGRATION PLAN**

**Current (Legacy):**
- AES-256-GCM client-side encryption (Web Crypto API)
- PBKDF2 key derivation

**Target (Hybrid):**
- Layer 1: Client-side AES-256-GCM (zero-knowledge)
- Layer 2: Supabase Vault (when Pro plan available)
- Defense-in-depth: Double encryption

**Abstraction:** `packages/api/src/encryption/`
- Supports: `client`, `vault`, `hybrid` modes
- Configurable via environment variable
- Backward compatible with existing encrypted data

### Security Features
- Audit logging on all sensitive operations
- Rate limiting (100 req/15min per IP)
- Content Security Policy (CSP)
- Helmet security headers
- JWT validation
- HTTPS only
