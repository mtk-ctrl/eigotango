-- 子ども管理・1日の問題数設定の列を追加（冪等）
-- daily_goal        : 1日の出題語数（親が子ごとに設定 / 本人も設定可）
-- daily_goal_locked : 親が設定したらロック（親優先 → 本人は変更不可）
-- managed_by        : 親が端末上で管理する「ログイン不要の子ども」プロフィールの親 ID
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_goal INT NOT NULL DEFAULT 10
    CHECK (daily_goal BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS daily_goal_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_profiles_managed_by ON profiles(managed_by);
