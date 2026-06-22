-- student_parent_relations からペアリングコード列を削除
-- (専用テーブルに移動)
ALTER TABLE student_parent_relations DROP COLUMN IF EXISTS pairing_code;
ALTER TABLE student_parent_relations DROP COLUMN IF EXISTS pairing_code_expires_at;

-- ペアリングコード専用テーブル
-- 親が生成 → 子が入力 → relations レコード作成後にこのレコードを削除
CREATE TABLE pairing_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code       CHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id),
  UNIQUE(code)
);

ALTER TABLE pairing_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pairing_codes_parent" ON pairing_codes
  FOR ALL USING (auth.uid() = parent_id);
