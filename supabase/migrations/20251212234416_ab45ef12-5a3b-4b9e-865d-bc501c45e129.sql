-- Add limit settings to invite_keys table
ALTER TABLE public.invite_keys 
ADD COLUMN preset_max_droplets integer DEFAULT 3,
ADD COLUMN preset_allowed_sizes text[] DEFAULT ARRAY['s-1vcpu-512mb-10gb', 's-1vcpu-1gb', 's-1vcpu-2gb', 's-2vcpu-2gb', 's-2vcpu-4gb', 's-4vcpu-8gb', 's-8vcpu-16gb'],
ADD COLUMN preset_auto_destroy_days integer DEFAULT 0;