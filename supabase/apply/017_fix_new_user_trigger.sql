-- handle_new_user を堅牢化（冪等）。
-- - search_path を明示（SECURITY DEFINER の解決先を固定）
-- - ON CONFLICT (id) DO NOTHING（再実行・二重発火に耐える）
-- - 例外を握って RETURN NEW（プロフィール作成失敗で auth ユーザー作成自体を 500 にしない）
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
exception when others then
  raise warning 'handle_new_user failed: %', sqlerrm;
  return new;
end;
$$;
