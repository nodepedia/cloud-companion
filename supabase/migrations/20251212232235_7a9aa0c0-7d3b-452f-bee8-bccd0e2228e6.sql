-- Add user_limits table for droplet count, specs, and auto destroy settings
CREATE TABLE public.user_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_droplets integer NOT NULL DEFAULT 3,
  allowed_sizes text[] NOT NULL DEFAULT ARRAY['s-1vcpu-512mb-10gb', 's-1vcpu-1gb', 's-1vcpu-2gb', 's-2vcpu-2gb', 's-2vcpu-4gb', 's-4vcpu-8gb', 's-8vcpu-16gb'],
  auto_destroy_days integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_limits
CREATE POLICY "Admins can manage user limits"
ON public.user_limits FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own limits"
ON public.user_limits FOR SELECT
USING (user_id = auth.uid());

-- Add max_uses and current_uses columns to invite_keys
ALTER TABLE public.invite_keys 
ADD COLUMN max_uses integer NOT NULL DEFAULT 1,
ADD COLUMN current_uses integer NOT NULL DEFAULT 0;

-- Update trigger for updated_at
CREATE TRIGGER update_user_limits_updated_at
BEFORE UPDATE ON public.user_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();