-- Add employment status and study field columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN employment_status text,
ADD COLUMN study_field text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.employment_status IS 'User employment status: student, employed, or job_seeking';
COMMENT ON COLUMN public.profiles.study_field IS 'For students: their field of study';