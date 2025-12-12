-- Add is_suspended column to profiles table
ALTER TABLE public.profiles ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;

-- Add index for faster queries on suspended users
CREATE INDEX idx_profiles_is_suspended ON public.profiles(is_suspended);