-- handle_new_user トリガーを upsert に変更（重複 ID 時の安全対策）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    role        = COALESCE(EXCLUDED.role, profiles.role),
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  RETURN NEW;
END;
$$;
