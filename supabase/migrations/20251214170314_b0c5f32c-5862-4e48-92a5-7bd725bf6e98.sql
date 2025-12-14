-- Add server_ip column to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS server_ip text;