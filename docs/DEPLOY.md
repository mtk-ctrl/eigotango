# DEPLOY — デプロイパイプライン / CI 検証

## push → CI 一本道

| 変更対象 | トリガー | 自動処理 | 検証 |
|---|---|---|---|
| `src/` (フロント) | main へ push | Cloudflare Workers Builds が OpenNext でビルド・デプロイ | 本番 URL 確認 |
| `supabase/functions/` | main へ push | CI が `supabase functions deploy` | CI run = success |
| `supabase/migrations/` | main へ push | CI の `db push` は **`SUPABASE_DB_PASSWORD` 未設定でスキップ中**（正本のみ更新） | — |
| 本番 DB へ今すぐ反映 | `supabase/apply/*.sql` を main へ push | `db-apply.yml` が Management API で適用 | CI success + HTTP 2xx（→ `docs/DB.md`） |
| `cloudflare/wrangler.toml` (Cron) | main へ push | CI が `wrangler deploy --config cloudflare/wrangler.toml` | CI run = success |
| Auth/Webhook 等の設定変更 | 使い捨て CI workflow | Management API を呼ぶ → 実行 → 削除 | CI run = success |

CI 定義: `.github/workflows/deploy.yml`（typecheck → DB → Edge Function → Cron Worker）。
未設定 Secret のジョブはスキップされる（段階的に有効化できる）。

## フロントのデプロイ構成（Workers + OpenNext）

- Next.js は **Cloudflare Workers** に `@opennextjs/cloudflare` でデプロイ（Cloudflare Pages は非推奨）。
- Server Actions（Node.js ランタイム）を使うため Pages の Edge ランタイムでは動かない。
- 設定ファイル: ルートの `wrangler.jsonc`（`main: .open-next/worker.js`, `nodejs_compat`）と `open-next.config.ts`。
- デプロイは Cloudflare の Git 連携（Workers Builds）が担当。Deploy command: `npx opennextjs-cloudflare deploy`。
- `NEXT_PUBLIC_*` はビルド時に埋め込まれるため、Worker の環境変数に設定すれば Workers Builds でも参照される。

## CI 後の検証ループ（必須）

1. push / マージ後、GitHub Actions の最新 run を MCP（`mcp__github__actions_list`）で取得。
2. `conclusion = "success"` を確認してから「完了しました」と報告。
3. 失敗したらジョブログ（`mcp__github__get_job_logs`）を取得 → 原因修正 → 再 push（緑になるまでループ）。

フロントのみの変更は Cloudflare 直結ビルドなので GitHub Actions の確認は不要（本番 URL で確認）。

## 新しい外部サービスを追加する手順

1. 調査: REST/Management API と認証方式を特定。
2. Secret 登録: 機密情報だけオーナーに 1 回貼ってもらう。
3. 実装: 呼び出しはサーバ側に寄せる。
4. 反映: push → CI で自動デプロイ。
5. 検証: CI success + 実応答で確認。
6. 台帳化: `docs/SECRETS.md` に 1 行追記（値は書かない）。
