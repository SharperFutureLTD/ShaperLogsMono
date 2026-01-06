-- Migration: Add status enum field to targets table
-- Purpose: Separate Archive from Delete functionality
-- Date: 2026-01-03

-- Step 1: Add status column (nullable during migration)
ALTER TABLE public.targets
ADD COLUMN status TEXT;

-- Step 2: Backfill existing data based on is_active field
UPDATE public.targets
SET status = CASE
  WHEN is_active = true THEN 'active'
  WHEN is_active = false THEN 'deleted'
  ELSE 'active'
END;

-- Step 3: Set NOT NULL constraint and default value
ALTER TABLE public.targets
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'active';

-- Step 4: Add check constraint for valid statuses
ALTER TABLE public.targets
ADD CONSTRAINT targets_status_check
CHECK (status IN ('active', 'archived', 'deleted'));

-- Step 5: Create trigger to keep is_active in sync during transition
-- This ensures backward compatibility while we migrate
CREATE OR REPLACE FUNCTION sync_target_is_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically set is_active based on status
  NEW.is_active := (NEW.status = 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_target_is_active
BEFORE INSERT OR UPDATE ON public.targets
FOR EACH ROW
EXECUTE FUNCTION sync_target_is_active();

-- Add helpful comment
COMMENT ON COLUMN public.targets.status IS 'Target lifecycle status: active (working on), archived (on hold/paused), deleted (soft deleted with undo)';
COMMENT ON COLUMN public.targets.is_active IS 'DEPRECATED: Kept for backward compatibility, automatically synced from status field. Use status field instead.';
