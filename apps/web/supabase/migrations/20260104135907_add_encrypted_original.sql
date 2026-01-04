-- Add encrypted_original column to work_entries table
-- This stores the full unredacted conversation in AES-256-GCM encrypted format

ALTER TABLE public.work_entries
ADD COLUMN IF NOT EXISTS encrypted_original TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.work_entries.encrypted_original IS
  'AES-256-GCM encrypted JSON string of original unredacted conversation';

-- Index for faster queries (optional - only indexes non-null values)
CREATE INDEX IF NOT EXISTS idx_work_entries_encrypted_original
ON public.work_entries(encrypted_original)
WHERE encrypted_original IS NOT NULL;
