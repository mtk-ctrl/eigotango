-- handle_new_user トリガーを修正
-- 1) public.profiles に明示修飾（supabase_auth_admin の search_path 対策）
-- 2) SET search_path = public
-- 3) ON CONFLICT で重複 ID を安全に
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    role         = EXCLUDED.role,
    display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$$;
