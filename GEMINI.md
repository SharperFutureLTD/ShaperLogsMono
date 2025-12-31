# Sharper-Logs Project Context

## Project Overview
**Sharper-Logs** is a professional development logging and content generation application. It allows users to log their work achievements, skills, and metrics, and leverages **Google Gemini 2.5 Flash** (via Lovable's AI Gateway) to transform these logs into various professional documents such as resumes, performance reviews, brag docs, and LinkedIn posts.

The application is industry-aware, providing tailored prompts and content types for sectors like Engineering, Sales, Healthcare, Education, and more.

## Directory Structure
The main application code is located in the `sharperlogs/` directory.

## Tech Stack
- **Frontend:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS, shadcn-ui, Lucide React icons
- **State Management:** TanStack Query (React Query)
- **Routing:** React Router DOM
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **AI Integration:** Supabase Edge Functions acting as a proxy to Gemini 2.5 Flash.

## Architecture

### Frontend (`sharperlogs/src/`)
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

### Backend (`sharperlogs/supabase/`)
- **Edge Functions:** Located in `sharperlogs/supabase/functions/`.
    - `ai-generate/index.ts`: The core AI logic. It receives user inputs + work history, selects an industry-specific system prompt, and calls the Gemini API.
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

### Scripts (Run from `sharperlogs/` directory)
- `npm run dev`: Start the local development server (Vite).
- `npm run build`: Build for production.
- `npm run preview`: Preview the production build.
- `npm run lint`: Run ESLint.

### Environment Variables
- `LOVABLE_API_KEY`: Required in Supabase Edge Functions to authenticate with the AI gateway.
- `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`: Required in frontend `.env` (handled by Supabase client).

## AI Configuration (Gemini)
The project explicitly uses `google/gemini-2.5-flash` in `sharperlogs/supabase/functions/ai-generate/index.ts`.
Prompts are structured with:
1.  **System Prompt:** Defines the persona (Career Content Generator) and includes industry-specific instructions.
2.  **Context:** The user's work history formatted as a list of entries with dates.
3.  **User Prompt:** The specific request from the user.
