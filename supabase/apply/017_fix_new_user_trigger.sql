-- handle_new_user を堅牢化（冪等）。
-- - search_path を明示（SECURITY DEFINER の解決先を固定 → 500 の主因だったスキーマ解決失敗を解消）
-- - ON CONFLICT (id) DO NOTHING（再実行・二重発火に耐える）
-- 例外は握り潰さない: 想定外の失敗時はロールバックして auth ユーザー作成ごとキャンセルし、
-- プロフィールの無い孤立 Auth ユーザーが生まれないようにする（ユーザーは再試行可能）。
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, role, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
