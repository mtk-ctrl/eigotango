# eigotango — 英単語学習 LINE 連携アプリ

---

## 役割分担（最優先ルール）

| 担当 | 役割 |
|---|---|
| **AI（CEO）** | コード実装・デプロイ・DB 操作・API 設定変更・マージ・レビュー — **全部やる** |
| **オーナー** | ビジネス判断・Secret の物理的な初回貼り付け — **それだけ** |

「実装してよいか」「マージしていいか」は **聞かない**。  
指示 = 実行承認。破壊的変更（DB スキーマ削除・課金フロー変更）だけ草案を上申してから実行。

---

## 完了前チェックリスト（毎回必須）

1. `npm run typecheck` が通ること
2. コミット（`feat:` / `fix:` / `chore:` + 日本語 OK）
3. feature ブランチに push
4. main へマージ（確認不要）→ CI success を MCP で確認
5. 画面変更があれば本番 URL で動作確認

---

## 概要

中学生向け英単語学習アプリ。SM-2 アルゴリズムで最適タイミングに LINE 通知 → LIFF アプリで回答 → 親に結果通知。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind CSS → Cloudflare Workers (OpenNext アダプター) |
| Backend/DB | Supabase (PostgreSQL + Auth + Edge Functions) |
| 通知 | LINE Messaging API (LIFF + Messaging API) |
| 認証 | LINE Login (LIFF) → Supabase Auth |
| 決済 | Stripe Checkout |
| Cron | Cloudflare Workers Cron Triggers → Edge Function |

## ファイル構成（1 ファイル 1 責務）

```
src/
├── types/
│   ├── database.ts      # DB テーブルの型
│   └── api.ts           # API req/res の型
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # ブラウザ用クライアント
│   │   └── server.ts    # サーバー用クライアント
│   ├── sm2.ts           # SM-2 アルゴリズム（純粋関数）
│   └── liff.ts          # LIFF 初期化ユーティリティ
├── app/
│   ├── (liff)/
│   │   ├── study/       # 子ども: 今日の学習
│   │   ├── progress/    # 子ども: 学習進捗
│   │   ├── parent/      # 親: ダッシュボード
│   │   └── pairing/     # 親子紐付け
│   ├── login/           # LINE ログインページ
│   └── api/
│       ├── line/webhook/    # LINE Webhook（署名検証必須）
│       └── stripe/webhook/  # Stripe Webhook（署名検証必須）
├── components/
│   ├── study/           # WordCard, AnswerButtons など
│   └── ui/              # Button, Card など汎用部品
└── middleware.ts        # Supabase Auth セッション更新

supabase/
├── migrations/          # 番号順に実行
├── functions/
│   ├── batch-notify/    # 毎日の問題送信（Cron から呼ばれる）
│   └── stripe-webhook/  # Stripe Webhook（Edge Function 版）
└── seed.sql             # テスト用 50 語
```

## 主要データフロー

```
【毎日の通知】
Cloudflare Workers Cron (UTC 22:00 = JST 07:00)
→ batch-notify Edge Function
→ user_word_progress WHERE next_review_date <= today を抽出
→ LINE Messaging API で各ユーザーに LIFF リンク付き通知

【回答フロー】
LINE 通知 → タップ → LIFF 起動 → study ページで回答
→ Server Action → SM-2 計算 → DB 更新
→ セッション完了 → 親の LINE に結果通知

【課金】
LIFF 内 Stripe Checkout → stripe-webhook → subscriptions 更新
```

## SM-2 品質スコア（UI は 3 択）

| UI の選択 | quality 値 |
|---|---|
| 知ってた！ | 5 |
| なんとなく | 3 |
| 知らなかった | 1 |

`src/lib/sm2.ts` の `QUALITY_MAP` を参照。

## プラン制限

- 無料: 20 語/日（`batch-notify` で LIMIT を切り替え）
- プレミアム: 無制限 + 親への詳細レポート
- 判定: `subscriptions.plan` を `student → parent → subscription` で JOIN

## ペアリング方式

6 桁コード方式: 親がダッシュボードでコード生成 → 子どもが LIFF 上で入力。  
`student_parent_relations.pairing_code` に保存（24 時間有効）。

---

## デプロイパイプライン（push → CI 一本道）

| 変更対象 | トリガー | 自動処理 | 検証 |
|---|---|---|---|
| `src/` (フロント) | main へ push | Cloudflare Workers Builds が OpenNext でビルド・デプロイ | 本番 URL 確認 |
| `supabase/functions/` | main へ push | CI が `supabase functions deploy` | CI run = success |
| `supabase/migrations/` | main へ push | CI が `supabase db push` | CI run = success |
| `cloudflare/wrangler.toml` (Cron) | main へ push | CI が `wrangler deploy --config cloudflare/wrangler.toml` | CI run = success |
| Auth/Webhook 等の設定変更 | 使い捨て CI workflow | Management API を呼ぶ → 実行 → 削除 | CI run = success |

**手元から本番を直接触らない。** ローカルでの `supabase db push` や `wrangler deploy` は禁止。

### フロントのデプロイ構成（Workers + OpenNext）

- Next.js は **Cloudflare Workers** に `@opennextjs/cloudflare` アダプターでデプロイ（Cloudflare Pages は非推奨）。
- Server Actions（Node.js ランタイム）を使うため Pages の Edge ランタイムでは動かない。
- 設定ファイル: ルートの `wrangler.jsonc`（`main: .open-next/worker.js`, `nodejs_compat`）と `open-next.config.ts`。
- デプロイは Cloudflare の Git 連携（Workers Builds）が担当。Deploy command: `npx opennextjs-cloudflare deploy`。
- `NEXT_PUBLIC_*` はビルド時に埋め込まれるため、Worker の環境変数に設定すれば Workers Builds のビルドでも参照される。

### CI 後の検証ループ

1. push 後、GitHub Actions の最新 run を MCP で取得する
2. `conclusion = "success"` を確認してから「完了しました」と報告する
3. 失敗したらジョブログを取得 → 原因修正 → 再 push（緑になるまでループ）

---

## Secret 台帳（値は書かない・置き場所だけ記録）

### GitHub Secrets（CI デプロイ用）

| Secret 名 | 用途 |
|---|---|
| `SUPABASE_PROJECT_REF` | Supabase Project ID（Project Settings → General） |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI 認証（supabase.com/dashboard/account/tokens） |
| `LINE_CHANNEL_ACCESS_TOKEN` | Edge Function シークレットとして自動同期 |
| `LINE_CHANNEL_SECRET` | Edge Function シークレットとして自動同期 |
| `CLOUDFLARE_API_TOKEN` | Wrangler デプロイ用（Cloudflare → API Tokens → Edit Cloudflare Workers） |
| `CLOUDFLARE_ACCOUNT_ID` | Wrangler デプロイ先アカウント |

### Cloudflare Workers 環境変数（Next.js アプリ用）

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
| `STRIPE_SECRET_KEY` | Secret | Stripe Checkout 作成 |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe Webhook 署名検証 |
| `STRIPE_PREMIUM_PRICE_ID` | Var | プレミアムプランの Price ID |

### Cloudflare Worker シークレット（Cron Worker 用）

Workers → eigotango-cron → Settings → Variables

| シークレット名 | 用途 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | batch-notify から Supabase を叩くための鍵 |

---

## オーナーの初回セットアップ（これだけ）

1. **GitHub Secrets を登録**（リポジトリ → Settings → Secrets and variables → Actions）
   - 上記テーブルの「GitHub Secrets」欄にある 6 項目を貼り付ける

2. **Cloudflare Workers を GitHub と連携（Next.js アプリ）**
   - Cloudflare → Workers & Pages → Create → Import a repository
   - リポジトリ `mtk-ctrl/eigotango` を選択（Worker 名: `eigotango`）
   - Deploy command: `npx opennextjs-cloudflare deploy`（Build command は空）
   - 上記「Cloudflare Workers 環境変数」欄の項目を Variables and secrets に設定
   - `wrangler.jsonc` / `open-next.config.ts` は設定済み

3. **Cron Worker のシークレット設定**
   - Workers → eigotango-cron → Settings → Variables
   - `SUPABASE_SERVICE_ROLE_KEY` を追加（CI 初回デプロイ後に Worker が現れる）

4. **main にマージ → 以後は全自動**

---

## 開発パターン

### AI にできることをオーナーに依頼しない（絶対）

「ダッシュボードで〇〇して」と言う前に Management API や自動化手段を探す。  
自動化できない場合は **使い捨て GitHub Actions workflow** を作って API を呼ぶ → 実行 → 削除。

例:
- Supabase Auth テンプレート変更 → Management API PATCH
- LINE Webhook URL 登録 → LINE Messaging API Channel Endpoint API
- Stripe Webhook エンドポイント登録 → Stripe API POST /v1/webhook_endpoints

### 新しい外部サービスを追加する手順

1. **調査**: REST/Management API と認証方式を特定
2. **Secret 登録**: 機密情報だけオーナーに 1 回貼ってもらう
3. **実装**: 呼び出しはサーバ側（Edge Function / Server Action）に寄せる
4. **反映**: push → CI で自動デプロイ
5. **検証**: CI success + 実応答で確認
6. **台帳化**: 上記 Secret 台帳に 1 行追記（値は書かない）

### 未接続サービスの扱い（開発を止めない）

- バックエンド未接続時はモック実装で全画面が動く設計にする
- Secret 投入だけで有効化される状態にしておく
- 例: Stripe 未設定 → Checkout URL 生成が失敗しても UI は表示される

### ブランチ・コミット運用

- 開発は `claude/` プレフィックスのブランチで行う
- コミットメッセージ: `feat:` / `fix:` / `chore:` プレフィックス + 日本語 OK
- **main へのマージは毎回・無確認（例外なし）** — main push = 本番反映 = CI 自動デプロイ
- PR はオーナーから明示的に依頼があった時だけ作成する
