-- 「新規語」と「復習(アクティブリコール)」の1日の上限を分離（冪等）。
-- new_per_day: 1日に新しく学ぶ語数（既定3）。
-- 復習の上限は従来の daily_goal をそのまま流用する（画面・設定で「復習の上限」として扱う）。
alter table profiles add column if not exists new_per_day integer not null default 3;
