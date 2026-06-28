-- mtk551141@gmail.com をプレミアムプランに（登録済みなら・冪等）
insert into subscriptions (parent_id, plan, status)
select u.id, 'premium', 'active'
from auth.users u
where u.email = 'mtk551141@gmail.com'
on conflict (parent_id) do update
  set plan = 'premium', status = 'active', updated_at = now();

-- 確認用（CI ログに出力）: 登録の有無とプラン
select u.email, p.role, s.plan, s.status
from auth.users u
left join profiles p on p.id = u.id
left join subscriptions s on s.parent_id = u.id
where u.email = 'mtk551141@gmail.com';
