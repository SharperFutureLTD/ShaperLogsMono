-- Create ai_user_profiles table for AI-generated user context
-- This stores a "Claude.md" style profile for each user to personalize AI generation
CREATE TABLE public.ai_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Safe user info (NO PII - only first name and display name allowed)
  first_name TEXT,
  profile_name TEXT,

  -- Writing style analysis (extended from VoiceProfile)
  writing_style JSONB DEFAULT '{}',
  -- Expected structure:
  -- {
  --   "sentenceLength": "short" | "medium" | "long",
  --   "avgWordCount": number,
  --   "tone": "casual" | "professional" | "technical" | "balanced",
  --   "patterns": string[],
  --   "preferredVocabulary": string[],
  --   "verbosity": "concise" | "detailed" | "varies"
  -- }

  -- Career context (current role comes from career_history table, not stored here)
  industry TEXT,
  employment_status TEXT,
  career_summary TEXT,

  -- Goals and preferences (AI-extracted from entries)
  career_goals TEXT[] DEFAULT '{}',
  regular_activities TEXT[] DEFAULT '{}',

  -- Aggregated skills (with frequency counts)
  aggregated_skills JSONB DEFAULT '{}',
  -- Expected structure: { "TypeScript": 45, "React": 38, "Node.js": 25, ... }

  skill_categories JSONB DEFAULT '{}',
  -- Expected structure: { "frontend": ["React", "CSS"], "backend": ["Node.js", "PostgreSQL"], ... }

  -- Generation preferences
  preferences JSONB DEFAULT '{}',
  -- Expected structure:
  -- {
  --   "preferredContentLength": "short" | "medium" | "long",
  --   "formalityLevel": 1-5,
  --   "includeMetrics": boolean
  -- }

  -- Metadata
  last_generated_at TIMESTAMPTZ,
  entries_analyzed_count INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own AI profile"
ON public.ai_user_profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI profile"
ON public.ai_user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI profile"
ON public.ai_user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Index for user lookup (already unique on user_id, but explicit index)
CREATE INDEX idx_ai_user_profiles_user ON public.ai_user_profiles(user_id);

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_ai_user_profiles_updated_at
BEFORE UPDATE ON public.ai_user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
