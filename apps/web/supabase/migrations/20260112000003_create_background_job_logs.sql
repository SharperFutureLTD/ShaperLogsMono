-- Create background_job_logs table for tracking cron jobs
-- Used for monitoring summary generation and AI profile regeneration jobs
CREATE TABLE public.background_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.background_job_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own job logs
CREATE POLICY "Users can view own job logs"
ON public.background_job_logs FOR SELECT USING (auth.uid() = user_id);

-- Note: Insert/update/delete should only be done by service role (background jobs)
-- No user-facing policies for modification

-- Indexes for monitoring and querying
CREATE INDEX idx_background_jobs_status ON public.background_job_logs(status, created_at DESC);
CREATE INDEX idx_background_jobs_user ON public.background_job_logs(user_id, job_type);
CREATE INDEX idx_background_jobs_type_date ON public.background_job_logs(job_type, created_at DESC);
