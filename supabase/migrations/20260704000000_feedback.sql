-- フィードバック（不具合報告・改善要望）テーブル
create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  email      text,
  role       text,
  category   text not null default 'other' check (category in ('bug','request','other')),
  message    text not null,
  image_url  text,
  user_agent text,
  status     text not null default 'new' check (status in ('new','read','done')),
  created_at timestamptz not null default now()
);
create index if not exists idx_feedback_created on feedback (created_at desc);
create index if not exists idx_feedback_status on feedback (status);

alter table feedback enable row level security;

-- 画像用の公開バケット（投入・参照はサーバーの service role 経由）
insert into storage.buckets (id, name, public)
values ('feedback', 'feedback', true)
on conflict (id) do nothing;
