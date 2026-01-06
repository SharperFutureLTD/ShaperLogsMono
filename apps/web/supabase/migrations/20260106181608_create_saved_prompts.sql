-- Create saved_prompts table for user custom prompts
CREATE TABLE public.saved_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own prompts
CREATE POLICY "Users can manage their own prompts"
ON public.saved_prompts FOR ALL USING (auth.uid() = user_id);

-- Index for efficient user lookups
CREATE INDEX idx_saved_prompts_user_id ON public.saved_prompts(user_id);

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_saved_prompts_updated_at
BEFORE UPDATE ON public.saved_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
