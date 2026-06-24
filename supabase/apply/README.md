# supabase/apply — Management API 適用レーン

ここに置いた `*.sql` は、main への push 時に `.github/workflows/db-apply.yml` が
Supabase Management API（`/v1/projects/{ref}/database/query`）経由で本番 DB に適用する。

CI の `supabase db push` は `SUPABASE_DB_PASSWORD` 未設定でスキップされる（ジョブは success 表示）
ため、当面の DB 変更はこのレーンで行う。詳細手順は `docs/DB.md`。

## ルール

- SQL は**必ず冪等**にする（`IF NOT EXISTS` / `ON CONFLICT DO ...` / `CREATE OR REPLACE`）。
  このレーンは push のたびにディレクトリ内の全 SQL を再適用しうるため。
- スキーマ正本は `supabase/migrations/`。ここはあくまで「今すぐ本番に流す」ための一時置き場。
- 適用してログで HTTP 2xx を確認したら、この SQL は削除してコミットする。
