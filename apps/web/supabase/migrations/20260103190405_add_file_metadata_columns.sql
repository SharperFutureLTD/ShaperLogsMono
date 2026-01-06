-- Add file metadata columns to target_documents table
-- Migration: 20260103190405_add_file_metadata_columns

-- Add new columns for file metadata
ALTER TABLE public.target_documents
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (to avoid errors on re-run)
DROP TRIGGER IF EXISTS update_target_documents_updated_at ON public.target_documents;

-- Create trigger to automatically update updated_at on row update
CREATE TRIGGER update_target_documents_updated_at
  BEFORE UPDATE ON public.target_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_target_documents_mime_type
  ON public.target_documents(mime_type);

CREATE INDEX IF NOT EXISTS idx_target_documents_file_size
  ON public.target_documents(file_size);

CREATE INDEX IF NOT EXISTS idx_target_documents_updated_at
  ON public.target_documents(updated_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.target_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.target_documents.mime_type IS 'MIME type of the uploaded file (e.g., application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)';
COMMENT ON COLUMN public.target_documents.updated_at IS 'Timestamp of last update (automatically maintained by trigger)';
