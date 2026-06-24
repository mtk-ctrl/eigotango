# NOW — 現況・直近タスク

> セッション開始時に自動表示される（SessionStart hook）。常に最新の状態だけをここに置く。

## ① いまの状態

- フロント全画面（study / progress / parent / pairing / login）実装済み。
- **本番 URL: https://eigotango.mtk551141.workers.dev**（2026-06-24 デプロイ・500 エラー解消済み）
- **認証はメール+パスワード方式**（LINE 不要・メール送信も不要）。新規登録時に生徒/保護者を選択。
- Supabase の `mailer_autoconfirm=true`（メール確認 OFF）を Management API で設定済み → 登録即ログイン。
- LINE は通知専用（webhook でメール送信してアカウント連携）。
- CI/CD パイプライン稼働中（typecheck → DB → Edge Function → Cron Worker → Cloudflare Workers）。
- Supabase Secrets 設定済み・DB マイグレーション自動化を実機検証済み。
- `NEXT_PUBLIC_*` はビルド時に焼き込まれるため `.env.production`（公開値・コミット済み）で管理。

## ② 次にやること

- [ ] LINE 連携の有効化（LIFF作成済み → `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` / `NEXT_PUBLIC_LIFF_ID` を登録）
- [ ] LIFF エンドポイント URL を本番 URL（https://eigotango.mtk551141.workers.dev）に更新
- [ ] Stripe 連携の有効化（`STRIPE_*` を登録 → Webhook エンドポイント登録）
- [ ] 本番 URL で全画面の動作確認（オーナー側で要確認・環境からは外部疎通不可）

## ③ 直近の完了タスク（最新 4 件・超えたら logs/CHANGELOG.md へ）

| 日付 | 内容 |
|---|---|
| 2026-06-24 | メール+パスワード認証に変更（メール送信不要／mailer_autoconfirm を Management API で OFF） |
| 2026-06-24 | LINE LIFF 認証を廃止しウェブ認証へ・LINE は通知専用に |
| 2026-06-24 | 本番 500 エラー修正（NEXT_PUBLIC をビルド時に空で焼き込んでいた／.env.production で解決） |
| 2026-06-24 | 本番 URL を記録・全ジョブ CI デプロイ成功を確認 |
