-- Add DELETE policy for admins on profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on user_roles (if not exists)
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on user_limits
DROP POLICY IF EXISTS "Admins can delete user limits" ON public.user_limits;
CREATE POLICY "Admins can delete user limits"
ON public.user_limits
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on droplets (ensure admin can delete any droplet)
DROP POLICY IF EXISTS "Admins can delete all droplets" ON public.droplets;
CREATE POLICY "Admins can delete all droplets"
ON public.droplets
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));