-- =============================================
-- eigotango 初期スキーマ
-- =============================================

-- プロフィール（auth.users の拡張）
CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('student', 'parent')),
  display_name      TEXT,
  line_user_id      TEXT UNIQUE,
  line_display_name TEXT,
  notification_time TIME NOT NULL DEFAULT '07:00:00',
  timezone          TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ユーザー作成時に自動でプロフィールを作成するトリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 親子紐付け
CREATE TABLE student_parent_relations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              UUID NOT NULL REFERENCES profiles(id),
  parent_id               UUID NOT NULL REFERENCES profiles(id),
  pairing_code            TEXT UNIQUE,
  pairing_code_expires_at TIMESTAMPTZ,
  paired_at               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, parent_id)
);

-- サブスクリプション（親アカウントに紐づく）
CREATE TABLE subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id              UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                   TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 英単語マスター
CREATE TABLE words (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word       TEXT NOT NULL UNIQUE,
  reading    TEXT,
  meaning    TEXT NOT NULL,
  example_en TEXT,
  example_ja TEXT,
  grade      TEXT CHECK (grade IN ('中1', '中2', '中3')),
  level      TEXT CHECK (level IN ('基礎', '標準', '難関')),
  tags       TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 単語学習進捗（SRS コア テーブル）
CREATE TABLE user_word_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES profiles(id),
  word_id          UUID NOT NULL REFERENCES words(id),
  easiness_factor  FLOAT NOT NULL DEFAULT 2.5,
  interval_days    INT NOT NULL DEFAULT 1,
  repetitions      INT NOT NULL DEFAULT 0,
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_reviews    INT NOT NULL DEFAULT 0,
  correct_count    INT NOT NULL DEFAULT 0,
  last_quality     INT CHECK (last_quality BETWEEN 0 AND 5),
  first_learned_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, word_id)
);

CREATE INDEX idx_uwp_review ON user_word_progress(student_id, next_review_date);
CREATE INDEX idx_uwp_student ON user_word_progress(student_id);

-- 学習セッション（1日1セッション）
CREATE TABLE study_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES profiles(id),
  session_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  total_words         INT NOT NULL DEFAULT 0,
  correct_words       INT NOT NULL DEFAULT 0,
  completed_at        TIMESTAMPTZ,
  parent_notified_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, session_date)
);

-- 個別回答ログ
CREATE TABLE session_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES study_sessions(id),
  word_id     UUID NOT NULL REFERENCES words(id),
  quality     INT NOT NULL CHECK (quality BETWEEN 0 AND 5),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parent_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;

-- profiles: 自分のプロフィールのみ読み書き可
CREATE POLICY "profiles_self" ON profiles
  FOR ALL USING (auth.uid() = id);

-- words: 全ユーザーが読み取り可（管理者のみ書き込み）
CREATE POLICY "words_read" ON words
  FOR SELECT USING (true);

-- user_word_progress: 自分のデータのみ
CREATE POLICY "uwp_self" ON user_word_progress
  FOR ALL USING (auth.uid() = student_id);

-- study_sessions: 自分のデータのみ
CREATE POLICY "sessions_self" ON study_sessions
  FOR ALL USING (auth.uid() = student_id);

-- session_answers: 自分のセッションのみ（JOIN で確認）
CREATE POLICY "answers_self" ON session_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE id = session_answers.session_id
        AND student_id = auth.uid()
    )
  );

-- student_parent_relations: 当事者のみ
CREATE POLICY "relations_parties" ON student_parent_relations
  FOR ALL USING (
    auth.uid() = student_id OR auth.uid() = parent_id
  );

-- subscriptions: 親のみ自分のサブスク確認可
CREATE POLICY "subscriptions_self" ON subscriptions
  FOR SELECT USING (auth.uid() = parent_id);
