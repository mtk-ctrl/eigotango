-- 「理解済み（スキップ）」フラグ
alter table user_word_progress add column if not exists known boolean not null default false;
create index if not exists idx_uwp_known on user_word_progress(student_id, known);
