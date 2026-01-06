-- Enable REPLICA IDENTITY FULL for complete row data on updates/deletes
ALTER TABLE public.work_entries REPLICA IDENTITY FULL;
ALTER TABLE public.generated_content REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generated_content;