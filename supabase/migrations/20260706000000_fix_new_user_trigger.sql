-- handle_new_user を堅牢化（search_path 明示・ON CONFLICT）。
-- 例外は握り潰さず、失敗時はロールバックして孤立 Auth ユーザーを防ぐ。
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
