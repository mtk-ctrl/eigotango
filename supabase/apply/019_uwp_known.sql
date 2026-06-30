-- 「理解済み（スキップ）」フラグを追加（冪等）。
-- known=true の語は新規にも復習にも出さない（far-future の next_review_date と併用）。
alter table user_word_progress add column if not exists known boolean not null default false;
create index if not exists idx_uwp_known on user_word_progress(student_id, known);
