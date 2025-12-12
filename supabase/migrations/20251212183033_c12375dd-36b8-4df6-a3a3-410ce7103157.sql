-- Add foreign key constraint from droplets.user_id to profiles.id
ALTER TABLE public.droplets
ADD CONSTRAINT droplets_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;