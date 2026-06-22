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
