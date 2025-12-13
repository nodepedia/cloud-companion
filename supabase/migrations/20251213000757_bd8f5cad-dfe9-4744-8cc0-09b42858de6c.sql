-- Create helper function to apply invite key limits and update usage
CREATE OR REPLACE FUNCTION public.apply_invite_limits(_key text, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  key_record invite_keys%ROWTYPE;
BEGIN
  -- Lock the invite key row and validate usage
  SELECT * INTO key_record
  FROM public.invite_keys
  WHERE key = _key
    AND is_active = true
    AND current_uses < max_uses
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite key tidak valid atau sudah mencapai batas penggunaan';
  END IF;

  -- Ensure there is a unique constraint on user_id for upsert
  BEGIN
    ALTER TABLE public.user_limits
    ADD CONSTRAINT user_limits_user_id_key UNIQUE (user_id);
  EXCEPTION
    WHEN duplicate_object THEN
      -- Constraint already exists, ignore
      NULL;
  END;

  -- Upsert user limits based on invite key presets
  INSERT INTO public.user_limits (user_id, max_droplets, allowed_sizes, auto_destroy_days)
  VALUES (
    _user_id,
    COALESCE(key_record.preset_max_droplets, 3),
    COALESCE(key_record.preset_allowed_sizes, ARRAY[
      's-1vcpu-512mb-10gb'::text,
      's-1vcpu-1gb'::text,
      's-1vcpu-2gb'::text,
      's-2vcpu-2gb'::text,
      's-2vcpu-4gb'::text,
      's-4vcpu-8gb'::text,
      's-8vcpu-16gb'::text
    ]),
    COALESCE(key_record.preset_auto_destroy_days, 0)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET max_droplets = EXCLUDED.max_droplets,
      allowed_sizes = EXCLUDED.allowed_sizes,
      auto_destroy_days = EXCLUDED.auto_destroy_days;

  -- Update invite key usage
  UPDATE public.invite_keys
  SET current_uses = key_record.current_uses + 1,
      used_by = _user_id,
      used_at = now(),
      is_active = (key_record.current_uses + 1) < key_record.max_uses
  WHERE id = key_record.id;
END;
$$;