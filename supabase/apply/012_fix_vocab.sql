-- 教材精度の修正（レビュー指摘反映・冪等）
-- 010/011 の seed は不自然な語を「自然な語」に直済み。ただし ON CONFLICT DO NOTHING のため、
-- 既に投入済みの「旧・不自然な語」は残ったまま（新語は別行として挿入される）。
-- ここで旧行を依存データごと削除し、hotel room の意味は同一語なので UPDATE で訂正する。

-- 旧・不自然な語を削除（自然な語は 010/011 が別行で投入済み）:
--   go broken（→get broken） / passby（→pass by） / walk dog（→walk the dog）
--   unite nations（→ 動詞 unite が 006 で既出のため重複回避で廃止）
DELETE FROM session_answers
  WHERE word_id IN (SELECT id FROM words WHERE word IN ('go broken','passby','walk dog','unite nations'));
DELETE FROM user_word_progress
  WHERE word_id IN (SELECT id FROM words WHERE word IN ('go broken','passby','walk dog','unite nations'));
DELETE FROM words
  WHERE word IN ('go broken','passby','walk dog','unite nations');

-- hotel room の意味に区切り文字を補う（同一語のため UPDATE・冪等）
UPDATE words SET meaning = 'ホテルの部屋、客室'
  WHERE word = 'hotel room' AND meaning = 'ホテルの部屋客室';
