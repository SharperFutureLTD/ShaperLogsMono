-- Add smart_data JSONB column to work_entry_targets for SMART formatted contributions
ALTER TABLE public.work_entry_targets 
ADD COLUMN smart_data JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.work_entry_targets.smart_data IS 'SMART formatted contribution: {specific, measurable, achievable, relevant, timeBound}';