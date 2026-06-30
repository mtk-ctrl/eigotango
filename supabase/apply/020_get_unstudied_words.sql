-- 未学習語（user_word_progress に行が無い語）をカリキュラム順で返す RPC（冪等）。
-- メモリ内フィルタや NOT IN(...)、PostgREST の既定取得上限(1000件)に依存せず、
-- DB 側でアンチジョイン＋並べ替え＋件数制限を行う。
-- 並び順は src/app/actions/study.ts の curriculumCompare と一致させること:
--   sort_order 昇順(null は最後) → 学年(中1<中2<中3<その他) → 難易度(基礎<標準<難関) → 英単語
create or replace function public.get_unstudied_words(
  p_student_id uuid,
  p_premium boolean,
  p_limit integer
)
returns setof words
language sql
stable
as $$
  select w.*
  from words w
  where (p_premium or w.tier = 'free')
    and not exists (
      select 1
      from user_word_progress p
      where p.student_id = p_student_id
        and p.word_id = w.id
    )
  order by
    w.sort_order asc nulls last,
    (case w.grade when '中1' then 1 when '中2' then 2 when '中3' then 3 else 4 end) asc,
    (case w.level when '基礎' then 1 when '標準' then 2 when '難関' then 3 else 2 end) asc,
    w.word asc
  limit greatest(p_limit, 0);
$$;
