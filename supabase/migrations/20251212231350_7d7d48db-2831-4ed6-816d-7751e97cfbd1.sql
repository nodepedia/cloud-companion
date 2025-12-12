-- Create site_settings table for storing general settings like favicon and custom domain
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  favicon_url TEXT,
  custom_domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view settings
CREATE POLICY "Admins can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Only admins can insert settings
CREATE POLICY "Admins can insert site settings" 
ON public.site_settings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Only admins can update settings
CREATE POLICY "Admins can update site settings" 
ON public.site_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Create storage bucket for site assets
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true);

-- Create policies for site-assets bucket
CREATE POLICY "Public can view site assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can upload site assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'site-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update site assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'site-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete site assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'site-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);