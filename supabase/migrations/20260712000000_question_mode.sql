-- 出題形式の手動設定（冪等）。既定 'auto' は従来どおり SM-2 習熟段階で自動切替。
-- 'auto' 以外を選ぶと、その形式に固定して出題する（熟語はスペル入力を避け4択にフォールバック）。
alter table profiles add column if not exists question_mode text not null default 'auto';
