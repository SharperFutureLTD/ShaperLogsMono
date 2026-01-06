-- Add industry column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN industry text DEFAULT NULL;