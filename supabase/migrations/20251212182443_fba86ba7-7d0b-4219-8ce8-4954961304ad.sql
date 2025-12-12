-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create droplets table to store user's droplet data
CREATE TABLE public.droplets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  digitalocean_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  region TEXT NOT NULL,
  size TEXT NOT NULL,
  image TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.droplets ENABLE ROW LEVEL SECURITY;

-- Users can view their own droplets
CREATE POLICY "Users can view own droplets"
ON public.droplets
FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own droplets
CREATE POLICY "Users can create own droplets"
ON public.droplets
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own droplets
CREATE POLICY "Users can update own droplets"
ON public.droplets
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own droplets
CREATE POLICY "Users can delete own droplets"
ON public.droplets
FOR DELETE
USING (user_id = auth.uid());

-- Admins can view all droplets
CREATE POLICY "Admins can view all droplets"
ON public.droplets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all droplets
CREATE POLICY "Admins can manage all droplets"
ON public.droplets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_droplets_updated_at
BEFORE UPDATE ON public.droplets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();