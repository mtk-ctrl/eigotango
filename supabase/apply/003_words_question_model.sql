-- words に複数正解・熟語・プラン区分の列を追加（冪等）
-- answers_en : 受理する英語答えの配列（例: たくさんの → {many, a lot of}）
-- is_idiom   : 熟語フラグ
-- tier       : free（基本100語）/ premium（高校受験）
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS answers_en TEXT[],
  ADD COLUMN IF NOT EXISTS is_idiom BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'premium'));

-- 既存行の answers_en を代表語で初期化（複数正解は後続シードで上書き）
UPDATE words SET answers_en = ARRAY[word] WHERE answers_en IS NULL;

CREATE INDEX IF NOT EXISTS idx_words_tier ON words(tier);
