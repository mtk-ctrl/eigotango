# ARCHITECTURE — 技術スタック / 構成 / データフロー

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
│   ├── stripe.ts        # Stripe 遅延初期化（getStripe）
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

## 設計原則

- バックエンド未接続時はモック実装で全画面が動く設計にする。Secret 投入だけで有効化。
- 外部呼び出しはサーバ側（Edge Function / Server Action）に寄せ、鍵を露出させない。
- 例: Stripe 未設定 → Checkout URL 生成が失敗しても UI は表示される。
