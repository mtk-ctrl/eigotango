# SECRETS — Secret 台帳 / オーナー初回セットアップ

**値はこのファイルに書かない。置き場所だけ記録する。**

## GitHub Secrets（CI デプロイ用）

| Secret 名 | 用途 |
|---|---|
| `SUPABASE_PROJECT_REF` | Supabase Project ID（Project Settings → General） |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI 認証（supabase.com/dashboard/account/tokens） |
| `LINE_CHANNEL_ACCESS_TOKEN` | Edge Function シークレットとして自動同期 |
| `LINE_CHANNEL_SECRET` | Edge Function シークレットとして自動同期 |
| `CLOUDFLARE_API_TOKEN` | Wrangler デプロイ用（Cloudflare → API Tokens → Edit Cloudflare Workers） |
| `CLOUDFLARE_ACCOUNT_ID` | Wrangler デプロイ先アカウント |

## Cloudflare Workers 環境変数（Next.js アプリ用）

Workers & Pages → eigotango → Settings → Variables and secrets

| 変数名 | 種別 | 用途 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Var | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Var | Supabase 公開鍵 |
| `NEXT_PUBLIC_LIFF_ID` | Var | LINE LIFF ID |
| `NEXT_PUBLIC_APP_URL` | Var | 本番 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Server Action 用 RLS バイパス鍵 |
| `LINE_CHANNEL_SECRET` | Secret | LINE Webhook 署名検証 |
| `LINE_CHANNEL_ACCESS_TOKEN` | Secret | LINE Push 送信 |
| `RESEND_API_KEY` | Secret | メール送信（resend.com で取得） |
| `RESEND_FROM` | Var | 送信元メールアドレス（例: `英語タンゴ <noreply@example.com>`）未設定時は `onboarding@resend.dev` |
| `STRIPE_SECRET_KEY` | Secret | Stripe Checkout 作成 |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe Webhook 署名検証 |
| `STRIPE_PREMIUM_PRICE_ID` | Var | プレミアムプランの Price ID |

## Cloudflare Worker シークレット（Cron Worker 用）

Workers → eigotango-cron → Settings → Variables

| シークレット名 | 用途 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | batch-notify から Supabase を叩くための鍵 |

## Supabase Edge Function シークレット（batch-notify 用）

Supabase Dashboard → Edge Functions → batch-notify → Secrets
または `supabase secrets set` コマンドで設定。

| シークレット名 | 用途 |
|---|---|
| `RESEND_API_KEY` | メール送信（Next.js 側と同じ値） |
| `RESEND_FROM` | 送信元メールアドレス（未設定時は `onboarding@resend.dev`） |
| `APP_URL` | 学習リンクの URL（`https://eigotango.mtk551141.workers.dev`） |

## オーナーの初回セットアップ（これだけ）

1. **GitHub Secrets を登録**（リポジトリ → Settings → Secrets and variables → Actions）
   - 上記「GitHub Secrets」の 6 項目を貼り付ける。

2. **Cloudflare Workers を GitHub と連携（Next.js アプリ）**
   - Cloudflare → Workers & Pages → Create → Import a repository
   - リポジトリ `mtk-ctrl/eigotango` を選択（Worker 名: `eigotango`）
   - Deploy command: `npx opennextjs-cloudflare deploy`（Build command は空）
   - 上記「Cloudflare Workers 環境変数」を Variables and secrets に設定
   - `wrangler.jsonc` / `open-next.config.ts` は設定済み

3. **Cron Worker のシークレット設定**
   - Workers → eigotango-cron → Settings → Variables
   - `SUPABASE_SERVICE_ROLE_KEY` を追加（CI 初回デプロイ後に Worker が現れる）

4. **main にマージ → 以後は全自動**
