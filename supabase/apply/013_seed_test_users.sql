-- 検証用テストアカウントを作成（冪等）。
-- プレミアム/無料の比較検証用に、親ロールを各2つ。パスワードは共通 'Test1234!'。
-- auth.users / auth.identities に直接作成 → on_auth_user_created トリガが profiles を生成。
-- subscriptions でプランを設定（premium 判定は plan='premium' のみ参照）。
--
-- 作成アカウント（メール / パスワード）:
--   oya-premium1@example.com / Test1234!  （親・プレミアム）
--   oya-premium2@example.com / Test1234!  （親・プレミアム）
--   oya-free1@example.com    / Test1234!  （親・無料）
--   oya-free2@example.com    / Test1234!  （親・無料）

-- crypt/gen_salt（pgcrypto）解決のため extensions をサーチパスに含める
SET search_path = auth, public, extensions;

DO $$
DECLARE
  u    RECORD;
  uid  UUID;
BEGIN
  FOR u IN
    SELECT * FROM (VALUES
      ('oya-premium1@example.com', 'プレミアム親1', 'premium'),
      ('oya-premium2@example.com', 'プレミアム親2', 'premium'),
      ('oya-free1@example.com',    '無料親1',       'free'),
      ('oya-free2@example.com',    '無料親2',       'free')
    ) AS t(email, name, plan)
  LOOP
    SELECT id INTO uid FROM auth.users WHERE email = u.email;

    IF uid IS NULL THEN
      uid := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        u.email, crypt('Test1234!', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('role', 'parent', 'display_name', u.name),
        '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), uid,
        jsonb_build_object('sub', uid::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
        'email', uid::text,
        now(), now(), now()
      );
    END IF;

    -- プラン設定（profiles はトリガ生成済み）
    INSERT INTO subscriptions (parent_id, plan, status)
    VALUES (uid, u.plan, 'active')
    ON CONFLICT (parent_id) DO UPDATE
      SET plan = EXCLUDED.plan, status = 'active', updated_at = now();
  END LOOP;
END $$;

-- 確認用（CI ログに出力）
SELECT p.email, p.role, s.plan
FROM profiles p
LEFT JOIN subscriptions s ON s.parent_id = p.id
WHERE p.email LIKE 'oya-%@example.com'
ORDER BY p.email;
