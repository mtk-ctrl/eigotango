# NOW — 現況・直近タスク

> セッション開始時に自動表示される（SessionStart hook）。常に最新の状態だけをここに置く。

## ① いまの状態

- フロント全画面（study / progress / parent / pairing / login）実装済み（モック動作可）。
- CI/CD パイプライン稼働中（typecheck → DB → Edge Function → Cron Worker）。
- Cloudflare Workers + OpenNext 構成に移行済み。Deploy command 設定済み。
- Supabase Secrets 設定済み・DB マイグレーション自動化を実機検証済み。

## ② 次にやること

- [ ] LINE 連携の有効化（`LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` を GitHub + Cloudflare に登録）
- [ ] Stripe 連携の有効化（`STRIPE_*` を登録 → Webhook エンドポイント登録）
- [ ] 本番 URL で全画面の動作確認

## ③ 直近の完了タスク（最新 4 件・超えたら logs/CHANGELOG.md へ）

| 日付 | 内容 |
|---|---|
| 2026-06-23 | CLAUDE.md を分割（docs/・NOW.md）＋ commit/deploy スキルと hooks を追加 |
| 2026-06-23 | CLAUDE.md を AI CEO 運用モデルへ統合・再整理 |
| 2026-06-23 | Cloudflare Workers + OpenNext 構成に移行（Pages 非推奨対応） |
| 2026-06-23 | CI を段階的設定に対応（未設定 Secret はスキップ） |
