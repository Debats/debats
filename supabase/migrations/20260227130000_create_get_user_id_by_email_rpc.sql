CREATE FUNCTION public.get_user_id_by_email(target_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE email = target_email LIMIT 1;
$$;
