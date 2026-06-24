# NOW — 現況・直近タスク

> セッション開始時に自動表示される（SessionStart hook）。常に最新の状態だけをここに置く。

## ① いまの状態

- フロント全画面（study / progress / parent / pairing / login）実装済み。
- **本番 URL: https://eigotango.mtk551141.workers.dev**（CI #19 デプロイ成功・2026-06-23）
- CI/CD パイプライン稼働中（typecheck → DB → Edge Function → Cron Worker → Cloudflare Workers）。
- Supabase Secrets 設定済み・DB マイグレーション自動化を実機検証済み。

## ② 次にやること

- [ ] LINE 連携の有効化（LIFF作成済み → `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` / `NEXT_PUBLIC_LIFF_ID` を登録）
- [ ] LIFF エンドポイント URL を本番 URL（https://eigotango.mtk551141.workers.dev）に更新
- [ ] Stripe 連携の有効化（`STRIPE_*` を登録 → Webhook エンドポイント登録）
- [ ] 本番 URL で全画面の動作確認

## ③ 直近の完了タスク（最新 4 件・超えたら logs/CHANGELOG.md へ）

| 日付 | 内容 |
|---|---|
| 2026-06-23 | CI に Cloudflare Workers デプロイジョブを追加（NEXT_PUBLIC vars 対応） |
| 2026-06-23 | CLAUDE.md を分割（docs/・NOW.md）＋ commit/deploy スキルと hooks を追加 |
| 2026-06-23 | CLAUDE.md を AI CEO 運用モデルへ統合・再整理 |
| 2026-06-23 | Cloudflare Workers + OpenNext 構成に移行（Pages 非推奨対応） |
