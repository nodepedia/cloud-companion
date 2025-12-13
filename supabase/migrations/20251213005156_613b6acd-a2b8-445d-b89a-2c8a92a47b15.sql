-- Create table for managing multiple DigitalOcean API keys
CREATE TABLE IF NOT EXISTS public.digitalocean_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  last_balance jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digitalocean_api_keys ENABLE ROW LEVEL SECURITY;

-- Admins can manage all API keys
CREATE POLICY "Admins can manage DO API keys"
ON public.digitalocean_api_keys
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to keep updated_at in sync
CREATE TRIGGER update_digitalocean_api_keys_updated_at
BEFORE UPDATE ON public.digitalocean_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();