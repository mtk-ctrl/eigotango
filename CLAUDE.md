# eigotango - 英単語学習 LINE 連携アプリ

## 概要
中学生向け英単語学習アプリ。SM-2アルゴリズムで最適タイミングにLINE通知 → LIFFアプリで回答 → 親に結果通知。

## 技術スタック
| レイヤー | 技術 |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind CSS → Cloudflare Pages |
| Backend/DB | Supabase (PostgreSQL + Auth + Edge Functions) |
| 通知 | LINE Messaging API (LIFF + Messaging API) |
| 認証 | LINE Login (LIFF) → Supabase Auth |
| 決済 | Stripe Checkout |
| Cron | Cloudflare Workers Cron Triggers → Edge Function |

## ファイル構成（省トークン設計：1ファイル1責務）

```
src/
├── types/
│   ├── database.ts      # DB テーブルの型（全テーブル）
│   └── api.ts           # API req/res の型
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # ブラウザ用クライアント
│   │   └── server.ts    # サーバー用クライアント
│   ├── sm2.ts           # SM-2アルゴリズム（純粋関数）
│   └── liff.ts          # LIFF 初期化ユーティリティ
├── app/
│   ├── (liff)/          # LIFFアプリのルート群（認証必須）
│   │   ├── study/       # 子ども: 今日の学習（メイン機能）
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
│   └── stripe-webhook/  # Stripe Webhook（Edge Function版）
└── seed.sql             # テスト用 50 語
```

## 主要データフロー

```
【毎日の通知】
Cloudflare Workers Cron → batch-notify Edge Function
→ user_word_progress WHERE next_review_date <= today を抽出
→ LINE Messaging API で各ユーザーに LIFF リンク付き通知

【回答フロー】
LINE 通知 → タップ → LIFF 起動 → study ページで回答
→ /api/study-answer (Server Action) → SM-2計算 → DB更新
→ セッション完了 → 親の LINE に結果通知

【課金】
LIFF 内 Stripe Checkout → stripe-webhook → subscriptions 更新
```

## SM-2 品質スコア（UIは3択）
| UI の選択 | quality 値 |
|---|---|
| 知ってた！ | 5 |
| なんとなく | 3 |
| 知らなかった | 1 |

`src/lib/sm2.ts` の `QUALITY_MAP` を参照。

## プラン制限
- 無料: 20語/日（`batch-notify` でLIMITを切り替え）
- プレミアム: 無制限 + 親への詳細レポート
- 判定: `subscriptions.plan` を `student → parent → subscription` でJOIN

## 環境変数（.env.local.example 参照）
必須:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（サーバー・Edge Function のみ）
- `NEXT_PUBLIC_LIFF_ID`
- `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID`

## ペアリング方式
6桁コード方式: 親がダッシュボードでコード生成 → 子どもが LIFF 上で入力。
`student_parent_relations.pairing_code` に保存（24時間有効）。

---

## 開発ルール（AI自動化の大原則）

### オーナー作業は最小化する
オーナーが手動でやるのは **物理的に不可能な初回登録だけ**:
- (a) APIキー等の秘密情報の初回登録（GitHub Secrets / Cloudflare環境変数への貼り付け）
- (b) Stripe の商品・価格の管理画面設定（APIでは価格作成後の変更不可のため）
- (c) LINE Developers / Supabase の初回プロジェクト作成（UIのみ）

それ以外は **AI が全部やる**。「ダッシュボードで○○して」と言う前に必ずAPIを探す。

### デプロイ・反映はすべて push → CI の一本道

| 変更対象 | トリガー | 自動処理 | 検証 |
|---|---|---|---|
| `src/` (フロント) | main へ push | Cloudflare Pages 自動ビルド | 本番URL確認 |
| `supabase/functions/` | main へ push | CI が `supabase functions deploy` | CI run = success |
| `supabase/migrations/` | main へ push | CI が `supabase db push` | CI run = success |
| `cloudflare/` (Cron Worker) | main へ push | CI が `wrangler deploy` | CI run = success |
| Auth/Webhook等の設定変更 | 使い捨て CI workflow | Management API を呼ぶ → 実行 → 削除 | CI run = success |

**手元から本番を直接触らない。** ローカルでの `supabase db push` や `wrangler deploy` は禁止。

### CI 後の検証ループ（必須）
1. push 後、GitHub Actions の最新 run を MCP で取得する
2. `conclusion = "success"` を確認してから「完了しました」と報告する
3. 失敗したらジョブログを取得 → 原因修正 → 再 push（緑になるまでループ）

### Secret の置き場所（コードには絶対書かない）

| Secret | 置き場所 | 用途 |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | GitHub Secrets | CI から Supabase Edge Function デプロイ |
| `SUPABASE_DB_PASSWORD` | GitHub Secrets | CI から DB マイグレーション実行 |
| `CLOUDFLARE_API_TOKEN` | GitHub Secrets | CI から Wrangler デプロイ |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloudflare Pages 環境変数 / Supabase Secrets | Edge Function・Server Action の RLS バイパス |
| `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` | Cloudflare Pages 環境変数 / Supabase Secrets | LINE Webhook 署名検証・Push 送信 |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Cloudflare Pages 環境変数 | Stripe Checkout・Webhook |

Secret の **値はこのファイルに書かない**。置き場所だけ上記に記録する。

### 設定変更を API で自動化できない場合
ローカルから叩けない設定（Secret が CI 側にしかない等）は
「使い捨て GitHub Actions workflow を作って API を呼ぶ → 実行 → 削除」で実現する。

例:
- Supabase Auth の Email テンプレート変更 → Management API PATCH
- LINE Webhook URL の登録 → LINE Messaging API Channel Endpoint API
- Stripe Webhook エンドポイント登録 → Stripe API POST /v1/webhook_endpoints

### 新しい外部サービスを追加する手順
1. **調査**: REST/Management API と認証方式を特定（まず API を探す）
2. **Secret 登録**: 機密情報だけオーナーに1回貼ってもらう。以降は AI が操作
3. **実装**: 呼び出しはサーバ側（Edge Function / Server Action）に寄せ、鍵を露出させない
4. **反映**: push → CI で自動デプロイ
5. **検証**: CI success ＋ 実応答で確認
6. **台帳化**: Secret の置き場所だけ上記テーブルに1行追記（値は書かない）

### 未接続サービスの扱い（開発を止めない）
- バックエンド未接続時はモック実装で全画面が動く設計にする
- 「後回し」のサービスはコードを先に実装済みにし、Secret 投入だけで有効化される状態にする
- 例: Stripe 未設定 → Checkout URL 生成が失敗してもUIは表示される

### ブランチ・コミット運用
- 開発は `claude/` プレフィックスのブランチで行う
- コミットメッセージは日本語 OK、`feat:` / `fix:` / `chore:` プレフィックス付き
- main へのマージ = 本番反映（CI が全自動でデプロイ）
- PR はオーナーから明示的に依頼があった時だけ作成する
