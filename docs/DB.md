# DB — 本番 DB 変更の適用手順

## 背景（重要）

CI の DB マイグレーションジョブ（`deploy.yml` の `supabase db push --linked`）は
**`SUPABASE_DB_PASSWORD` が未設定のため毎回スキップされる**。
スキップでもジョブは `success` 表示になるので、「CI 緑＝DB 反映済み」と誤認しないこと。

→ 当面、本番 DB のスキーマ変更・データ投入は **Management API 直叩き**で行う。
　 オーナーが `SUPABASE_DB_PASSWORD` を GitHub Secret に登録すれば `db push` が正常化し、
　 この手順は不要になる（その時は `deploy.yml` のDBジョブが本来の役割を果たす）。

## 標準手順（supabase/apply レーン）

常設ワークフロー `.github/workflows/db-apply.yml` が、`supabase/apply/*.sql` を
main への push 時に Management API（`POST /v1/projects/{ref}/database/query`）で順に適用する。
使い捨てワークフローを毎回作る必要はない。

1. **正本を更新**: スキーマ変更なら `supabase/migrations/` に通常通りマイグレーションを追加（将来 `db push` 正常化後のため）。
2. **適用 SQL を置く**: 同じ内容（または投入したいデータ）を**冪等な SQL** にして
   `supabase/apply/<連番>_<名前>.sql` に置く。
   - 冪等必須: `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` /
     `INSERT ... ON CONFLICT (...) DO NOTHING|UPDATE` / `CREATE OR REPLACE FUNCTION` など。
   - 理由: このレーンは push のたびにディレクトリ内の全 SQL を再適用しうるため。
3. **push**: `git add supabase/apply/... && git commit && git push origin main`。
4. **確認**: `mcp__github__actions_list`（workflow=`db-apply.yml`）で最新 run を取得 →
   `conclusion=success` と、ジョブログ（`mcp__github__get_job_logs`）で `HTTP 2xx` を確認。
   必要なら SQL 末尾に `select count(*) ...;` を足して件数も確認する。
5. **後片付け**: 適用済み SQL を `supabase/apply/` から削除してコミット・push
   （空 push でワークフローは無害に空振りする）。

## 手動トリガー / 単発の直叩き（任意）

- 常設ワークフローは `workflow_dispatch` でも起動できる（`mcp__github__actions_run_trigger`）。
- ワークフローを通さず単発で叩く使い捨て版が必要なら、過去の `seed-words.yml`（git 履歴）を参照。
  本質は以下の curl 1 本:

```bash
PAYLOAD=$(jq -Rs '{query: .}' path/to.sql)
curl -sS -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

`SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_REF` は GitHub Secrets にあり、
GitHub Actions ランナー内でのみ参照可能（手元の実行環境には無い）。
