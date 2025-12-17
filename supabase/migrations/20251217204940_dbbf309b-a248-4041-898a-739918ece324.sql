-- Fix login by username even when public.profiles is missing, and auto-bootstrap missing profile/role after login

CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  _email text;
BEGIN
  -- 1) Legacy lookup: public.profiles
  SELECT p.email
  INTO _email
  FROM public.profiles p
  WHERE p.username = lower(_username)
  LIMIT 1;

  IF _email IS NOT NULL THEN
    RETURN _email;
  END IF;

  -- 2) Fallback lookup: auth.users metadata (works even if profiles row doesn't exist)
  SELECT u.email
  INTO _email
  FROM auth.users u
  WHERE lower(COALESCE(u.raw_user_meta_data ->> 'username', '')) = lower(_username)
  LIMIT 1;

  RETURN _email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.bootstrap_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  _username text;
  _email text;
BEGIN
  -- Must be called by the user themselves (after they are logged in)
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT
    lower(COALESCE(u.raw_user_meta_data ->> 'username', '')),
    u.email
  INTO _username, _email
  FROM auth.users u
  WHERE u.id = _user_id;

  -- Ensure profile exists
  INSERT INTO public.profiles (id, username, email)
  VALUES (_user_id, NULLIF(_username, ''), _email)
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    email = COALESCE(public.profiles.email, EXCLUDED.email);

  -- Ensure a default role exists
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles r
    WHERE r.user_id = _user_id
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'user');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_user(uuid) TO authenticated;
