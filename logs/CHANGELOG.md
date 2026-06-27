# CHANGELOG — 完了タスク全履歴

> NOW.md の「直近の完了タスク」が 4 件を超えたら、最古の行をここの先頭に移す。

| 日付 | 内容 |
|---|---|
| 2026-06-27 | メール送信を Brevo API に切り替え（BREVO_API_KEY を Cloudflare Workers に登録済み） |
| 2026-06-24 | 本番 words テーブルが空で /study が即「完了」→ 50語を Management API で投入（db push がスキップされていた） |
| 2026-06-24 | ログアウトボタン追加（全認証済み画面）＋ 3パターン対応（親が直接 /study へアクセス可能） |
| 2026-06-24 | メール+パスワード認証に変更（メール送信不要／mailer_autoconfirm を Management API で OFF） |
| 2026-06-24 | LINE LIFF 認証を廃止しウェブ認証へ・LINE は通知専用に |
| 2026-06-23 | CLAUDE.md を AI CEO 運用モデルへ統合・再整理 |
| 2026-06-23 | Cloudflare Workers + OpenNext 構成に移行（Pages 非推奨対応） |
| 2026-06-23 | CI を段階的設定に対応（未設定 Secret はスキップ） |
| 2026-06-23 | SUPABASE_DB_PASSWORD を不要に（Management API 経由でマイグレーション） |
| 2026-06-23 | GitHub Actions CI/CD パイプライン構築（全自動デプロイ） |
| 2026-06-22 | 認証・親ダッシュボード・ペアリング・LINE 通知・Stripe 実装 |
| 2026-06-22 | 進捗ページ追加・TypeScript エラー修正 |
