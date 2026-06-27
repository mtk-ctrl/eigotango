-- profiles に通知チャネルとメールアドレス列を追加（冪等）
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_channel TEXT NOT NULL DEFAULT 'email'
    CHECK (notification_channel IN ('line', 'email', 'both')),
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 既存ユーザーのメールをバックフィル
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- 新規ユーザー作成時にメールもコピー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;
