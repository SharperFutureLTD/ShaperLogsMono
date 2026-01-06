-- Create work_entries table
CREATE TABLE public.work_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  redacted_summary TEXT NOT NULL,
  encrypted_original TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  achievements TEXT[] DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on work_entries
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_entries
CREATE POLICY "Users can view their own work entries"
ON public.work_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own work entries"
ON public.work_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work entries"
ON public.work_entries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own work entries"
ON public.work_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for work_entries updated_at
CREATE TRIGGER update_work_entries_updated_at
BEFORE UPDATE ON public.work_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create log_conversations table
CREATE TABLE public.log_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  work_entry_id UUID REFERENCES public.work_entries(id) ON DELETE SET NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on log_conversations
ALTER TABLE public.log_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for log_conversations
CREATE POLICY "Users can view their own conversations"
ON public.log_conversations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
ON public.log_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.log_conversations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.log_conversations
FOR DELETE
USING (auth.uid() = user_id);