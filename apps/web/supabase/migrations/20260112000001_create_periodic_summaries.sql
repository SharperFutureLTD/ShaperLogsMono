-- Create periodic_summaries table for monthly/quarterly/yearly work summaries
CREATE TABLE public.periodic_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Aggregated content
  summary_text TEXT NOT NULL,
  top_skills TEXT[] DEFAULT '{}',
  top_achievements TEXT[] DEFAULT '{}',
  key_metrics JSONB DEFAULT '{}',
  categories_breakdown JSONB DEFAULT '{}',
  work_entry_count INTEGER DEFAULT 0,

  -- Metadata for rollups
  source_entry_ids UUID[] DEFAULT '{}',
  source_summary_ids UUID[] DEFAULT '{}',

  -- Token tracking
  token_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one summary per user per period type per period
  UNIQUE(user_id, period_type, period_start)
);

-- Enable Row Level Security
ALTER TABLE public.periodic_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own summaries"
ON public.periodic_summaries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries"
ON public.periodic_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
ON public.periodic_summaries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
ON public.periodic_summaries FOR DELETE USING (auth.uid() = user_id);

-- Index for efficient lookups by user, period type, and date
CREATE INDEX idx_periodic_summaries_user_period
ON public.periodic_summaries(user_id, period_type, period_start DESC);

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_periodic_summaries_updated_at
BEFORE UPDATE ON public.periodic_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time subscriptions
ALTER TABLE public.periodic_summaries REPLICA IDENTITY FULL;
