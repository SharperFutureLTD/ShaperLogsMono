# Sharper-Logs Project Context

## 📊 Current Status

**Phase 2 NEARLY COMPLETE** - REST API fully integrated with Next.js web app

### What's Complete
- ✅ **REST API** - Hono server on port 3001 with 25+ endpoints and Swagger docs
- ✅ **Multi-Provider AI** - Claude, OpenAI, Gemini via abstraction layer
- ✅ **React Query Migration** - All hooks migrated from direct Supabase calls to REST API
- ✅ **Session Persistence** - Conversation state survives page refreshes
- ✅ **Optimistic Updates** - Immediate UI feedback with rollback on error
- ✅ **Real-time Subscriptions** - Supabase postgres_changes invalidate React Query cache
- ✅ **PII Redaction** - Multi-layer redaction (AI prompts + regex patterns)
- ✅ **File Processing** - PDF, Word, Excel, CSV parsing and AI extraction
- ✅ **Smart Target Mapping** - AI links work entries to goals with SMART criteria

### Remaining Work
- ⚠️ Voice-to-text endpoint (API exists, needs refinement)
- ⚠️ 4 AI endpoint enhancements (industry context improvements)
- ❌ WebSocket real-time updates (currently using Supabase subscriptions)
- ❌ Admin backoffice at `apps/admin`

**GIT WORKFLOW:** Commit and push after completing features. Do NOT include Claude attribution in commit messages.

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

- **Entry:** `app/layout.tsx` → `providers.tsx` (QueryClientProvider + AuthProvider)
- **Routing:** Next.js App Router with route groups:
    - `app/auth/page.tsx`: Terminal-style login/signup
    - `app/(authenticated)/page.tsx`: Main dashboard with 3 modes
    - `app/(authenticated)/profile/page.tsx`: User profile
    - `app/(authenticated)/settings/page.tsx`: Settings
    - `app/(authenticated)/billing/page.tsx`: Stripe subscription

**Dashboard Modes:**
| Mode | Component | Purpose |
|------|-----------|---------|
| Log | `LogMode.tsx` | Conversational work logging with voice |
| Generate | `GenerateMode.tsx` | AI content generation from work history |
| Targets | `TargetsMode.tsx` | Goal tracking with evidence linking |

**Components:** 97 total TSX files
- `ui/`: 49 shadcn-ui primitives
- `log/`: 7 components (conversation, summary review, history)
- `generate/`: 7 components (type selection, prompts, output)
- `targets/`: 12 components (cards, forms, document upload)

**State Management:** TanStack Query (React Query)
- Stale time: 60s, Cache time: 10min
- Retry: 2 attempts (queries), 1 (mutations)
- Centralized query key factory (`lib/query/keys.ts`)

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

## REST API (`packages/api/`)

- **Framework:** Hono (ultra-fast edge runtime)
- **Documentation:** Swagger UI at `http://localhost:3001/api/docs`
- **OpenAPI Spec:** `http://localhost:3001/api/openapi.json`

### Endpoints

**Core CRUD:**
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/profile` | GET, PUT | User profile (industry, employment status, study field) |
| `/api/work-entries` | GET, POST, PUT, DELETE | Work entry CRUD with pagination |
| `/api/targets` | GET, POST, PUT, DELETE | Target/goal management (soft delete, archive) |
| `/api/generated-content` | GET, POST, DELETE | Saved AI-generated documents |
| `/api/saved-prompts` | GET, POST, DELETE | Custom prompt templates |
| `/api/career` | GET, POST, PUT, DELETE | Career history entries |
| `/api/work-entry-targets` | GET, POST, DELETE | Junction: link work entries to targets |
| `/api/documents/upload` | POST | File upload with parsing (PDF, Word, Excel) |

**AI Endpoints:**
| Route | Description |
|-------|-------------|
| `/api/ai/generate` | Content generation (resume, brag doc, LinkedIn post, etc.) |
| `/api/ai/log-chat` | Conversational logging with data extraction |
| `/api/ai/summarize` | Convert conversation to work entry with target mappings |
| `/api/ai/extract-targets` | Extract KPIs/goals from uploaded documents |
| `/api/ai/voice-to-text` | OpenAI Whisper transcription (needs refinement) |

**Other:**
| Route | Description |
|-------|-------------|
| `/api/billing/*` | Stripe checkout and subscription management |
| `/api/health` | Server health check |

### Security Middleware
- **CORS:** Configurable allowed origins (localhost:3000, localhost:5173)
- **Rate Limiting:** 300 req/15min via Upstash Redis (in-memory fallback)
- **JWT Auth:** Supabase token validation on protected routes
- **Secure Headers:** Hono's `secureHeaders()` middleware

## AI Configuration (`packages/api/src/ai/`)

### Multi-Provider Support

Factory pattern implementation with singleton instances per provider:

| Provider | Model | Best For |
|----------|-------|----------|
| Claude (Anthropic) | claude-3-haiku-20240307 | Resumes, brag docs, professional writing |
| OpenAI | gpt-4o-mini | Creative content, LinkedIn posts |
| Google Gemini | gemini-2.5-flash | Fast summaries, document parsing |

**Configuration:** `DEFAULT_AI_PROVIDER=claude` in `.env`

### Modular Prompt System (`packages/api/src/ai/prompts/`)

| File | Purpose |
|------|---------|
| `system-prompts.ts` | Industry-specific persona (engineering, sales, healthcare, etc.) |
| `content-type-prompts.ts` | Type-specific guidance (resume, cover letter, LinkedIn) |
| `format-templates.ts` | Structural examples for each document type |
| `tone-guidelines.ts` | Human-sounding, authentic writing directives |
| `redaction-rules.ts` | PII protection rules (amounts, emails, client names) |
| `voice-analyzer.ts` | Analyzes user's writing style from past entries |

### AI Endpoint Flows

**Content Generation (`/api/ai/generate`):**
1. Fetches career history + recent work entries (max 20)
2. Analyzes user's writing voice from entries
3. Builds modular prompt: system + type + format + tone + voice
4. Applies redaction rules to work summaries
5. Returns polished, single output

**Conversational Logging (`/api/ai/log-chat`):**
1. Industry-aware system prompt with target context
2. Extracts: skills, achievements, metrics, category
3. Post-processing PII redaction
4. Auto-triggers summarize after 5 exchanges

**Summary Generation (`/api/ai/summarize`):**
1. Converts conversation to professional work entry
2. Smart target mapping with SMART criteria breakdown
3. Validates contribution values (positive, < 1000)
4. Returns: redactedSummary, skills[], achievements[], metrics, targetMappings[]

## Encryption & Security

### Client-Side Encryption
- **Algorithm:** AES-256-GCM (Web Crypto API)
- **Key Derivation:** PBKDF2 (100,000 iterations, SHA-256)
- **Format:** Base64(salt + IV + authTag + ciphertext)
- **Storage:** Encryption salt per user in localStorage

**What's Encrypted:**
- Original conversation logs (before redaction)
- Stored as `encrypted_original` in work_entries table

### PII Redaction (`packages/api/src/utils/redaction.ts`)

**Automatic Regex Detection:**
- Emails, phone numbers, SSNs, credit cards
- UK NINOs, IBANs, IPv4 addresses
- URLs, salary amounts, deal values

**AI-Instructed Redaction:**
- Client/customer names → `[CLIENT]`
- Project codenames → `[PROJECT]`
- Monetary amounts → `[AMOUNT]`

### Security Features
- Rate limiting: 300 req/15min per IP (Upstash Redis)
- JWT validation via Supabase auth
- Secure headers (Hono middleware)
- Row Level Security on all tables

## Database Schema

### Core Tables (Supabase PostgreSQL)

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `profiles` | user_id, industry, employment_status, study_field | User settings |
| `work_entries` | redacted_summary, encrypted_original, skills[], achievements[], metrics | Logged work |
| `targets` | name, type, target_value, current_value, deadline, status | Goals/KPIs |
| `work_entry_targets` | work_entry_id, target_id, contribution_value, smart_data | Junction table |
| `generated_content` | type, content, prompt, work_entry_ids[] | Saved AI outputs |
| `log_conversations` | messages (JSON), status, work_entry_id | Chat sessions |
| `target_documents` | file_name, file_path, parsed_content | Uploaded files |
| `career_history` | title, company, dates, skills[], is_current | Career timeline |

**Target Types:** `kpi`, `ksb`, `sales_target`, `goal`
**Target Status:** `active`, `archived`, `deleted`
**Employment Status:** `employed`, `job_seeking`, `student`, `apprentice`

All tables have Row Level Security (RLS) policies enforcing user ownership.

## React Query Hooks (`apps/web/src/hooks/`)

### Data Fetching Hooks

| Hook | Features |
|------|----------|
| `useProfile` | GET/PUT profile, 5 mutations (industry, status, etc.), optimistic updates |
| `useWorkEntries` | Infinite query with pagination, delete mutation, real-time subscription |
| `useTargets` | Full CRUD, soft delete with 5s undo, archive/restore, real-time |
| `useGeneratedContent` | CRUD for saved AI content, optimistic updates, real-time |
| `useTargetEvidence` | Complex join queries linking work entries to targets |
| `useSavedPrompts` | Custom prompt template management |
| `useCareerHistory` | Career timeline CRUD |

### Conversation Hooks

**`useLogConversation`** - Conversational work logging
- Session persistence via sessionStorage (user-scoped keys)
- Multi-step flow: chat → summarize → review → save
- Data extraction: skills, achievements, metrics, category
- Smart target mapping with contribution values
- Encrypts original conversation before saving

**`useGenerateConversation`** - AI content generation
- Type selection (resume, brag_doc, linkedin_post, etc.)
- Context document support
- Works with career history + recent entries

### Utility Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication state, signIn/signUp/signOut |
| `useVoiceRecording` | MediaRecorder + Whisper transcription |
| `useEncryption` | Client-side AES-256-GCM encryption |
| `useMobile` | Responsive breakpoint detection |

## User Journeys

### Journey 1: Work Logging
1. User enters **Log Mode** on dashboard
2. Types or speaks about their work (voice → Whisper → text)
3. AI asks follow-up questions, extracts skills/achievements
4. After 5 exchanges, auto-prompts to summarize
5. User reviews/edits summary and target mappings
6. Saves: encrypted original + redacted summary + target links

### Journey 2: Content Generation
1. User enters **Generate Mode**
2. Selects content type (resume, LinkedIn post, etc.)
3. Optionally uploads context document
4. AI generates content using work history + career + industry
5. User reviews, edits, copies, or saves

### Journey 3: Target Tracking
1. User enters **Targets Mode**
2. Creates targets manually OR uploads document for AI extraction
3. Logs work in Log Mode → AI links to relevant targets
4. Progress tracked via contribution values
5. Dashboard shows progress bars and status

## API Client (`apps/web/src/lib/api/client.ts`)

Singleton pattern with automatic JWT extraction from Supabase session:
- **Timeout:** 60s for AI endpoints, 30s for others
- **Auth:** Bearer token from `supabase.auth.getSession()`
- **FormData:** Automatic Content-Type handling for file uploads
- **Error Handling:** Custom `APIClientError` with status codes
