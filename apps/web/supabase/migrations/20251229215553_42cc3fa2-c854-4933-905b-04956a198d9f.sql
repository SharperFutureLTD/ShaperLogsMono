-- Create targets table for storing user goals, KPIs, KSBs
CREATE TABLE public.targets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  type text DEFAULT 'goal', -- 'kpi', 'ksb', 'sales_target', 'goal'
  target_value numeric, -- For numeric targets (e.g., 10000 for revenue)
  current_value numeric DEFAULT 0, -- Accumulated progress
  unit text, -- 'currency', 'count', 'percentage', etc.
  currency_code text DEFAULT 'GBP', -- For currency targets
  deadline timestamp with time zone,
  source_document_id uuid, -- Reference to uploaded document
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create target_documents table for uploaded PDFs
CREATE TABLE public.target_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL, -- Storage path
  parsed_content text, -- Extracted text from PDF
  document_type text DEFAULT 'targets', -- 'kpi', 'ksb', 'targets'
  created_at timestamp with time zone DEFAULT now()
);

-- Create junction table linking work entries to targets
CREATE TABLE public.work_entry_targets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_entry_id uuid REFERENCES public.work_entries(id) ON DELETE CASCADE,
  target_id uuid REFERENCES public.targets(id) ON DELETE CASCADE,
  contribution_value numeric, -- How much this entry contributed
  contribution_note text, -- AI-generated explanation
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(work_entry_id, target_id)
);

-- Add target_ids array to work_entries for quick access
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS target_ids uuid[] DEFAULT '{}';

-- Enable RLS on all new tables
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entry_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for targets
CREATE POLICY "Users can view their own targets" ON public.targets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own targets" ON public.targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own targets" ON public.targets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own targets" ON public.targets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for target_documents
CREATE POLICY "Users can view their own documents" ON public.target_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" ON public.target_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.target_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.target_documents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for work_entry_targets (join through work_entries ownership)
CREATE POLICY "Users can view their own work entry targets" ON public.work_entry_targets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.work_entries WHERE id = work_entry_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create their own work entry targets" ON public.work_entry_targets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.work_entries WHERE id = work_entry_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their own work entry targets" ON public.work_entry_targets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.work_entries WHERE id = work_entry_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own work entry targets" ON public.work_entry_targets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.work_entries WHERE id = work_entry_id AND user_id = auth.uid())
  );

-- Create updated_at triggers
CREATE TRIGGER update_targets_updated_at
  BEFORE UPDATE ON public.targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for target documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('target-documents', 'target-documents', false);

-- Storage RLS policies
CREATE POLICY "Users can upload own target documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'target-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own target documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'target-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own target documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'target-documents' AND (storage.foldername(name))[1] = auth.uid()::text);