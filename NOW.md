# NOW — 現況・直近タスク

> セッション開始時に自動表示される（SessionStart hook）。常に最新の状態だけをここに置く。

## ① いまの状態

- フロント全画面（study / progress / parent / pairing / login）実装済み。
- **本番 URL: https://eigotango.mtk551141.workers.dev**（2026-06-24 デプロイ・500 エラー解消済み）
- **認証はメール+パスワード方式**（LINE 不要・メール送信も不要）。新規登録時に生徒/保護者を選択。
- **3パターン対応**: ①親だけ（自分で学習）②子だけ（自分のアカウント）③親子連携。
  - 親は「子どもを追加」で **端末管理の子**（ログイン不要・名前+問題数を入力）か **連携**（ペアリングコードで自分のアカウントを持つ子）を選べる。
  - 親は子の代わりに学習（`/study?child=`）・記録閲覧（`/progress?child=`）・名前/問題数編集・削除が可能。
- **1日の問題数は設定可能**（既定10語・無料最大20・プレミアム最大100）。**親が子に設定するとロック（親優先）**、本人は `/progress` で設定。
- 学習画面に「← やめる」中断ボタンを追加（回答は保存済み）。
- Supabase の `mailer_autoconfirm=true`（メール確認 OFF）を Management API で設定済み → 登録即ログイン。
- LINE は通知専用（webhook でメール送信してアカウント連携）。
- CI/CD パイプライン稼働中（typecheck → DB → Edge Function → Cron Worker → Cloudflare Workers）。
- Supabase Secrets 設定済み・DB マイグレーション自動化を実機検証済み。
- `NEXT_PUBLIC_*` はビルド時に焼き込まれるため `.env.production`（公開値・コミット済み）で管理。

## ② 次にやること

- [ ] **CI の DB マイグレーションはスキップ中**（`SUPABASE_DB_PASSWORD` 未設定 → `db push` がスキップ／ジョブは success 扱い）。
      → 当面の DB 変更は `supabase/apply/*.sql` に置いて push（常設 `db-apply.yml` が Management API で適用）。**手順は `docs/DB.md`**。
      → 恒久対応はオーナーが `SUPABASE_DB_PASSWORD` を GitHub Secret 登録（登録後はこのレーン不要）。
- [ ] LINE 連携の有効化（LIFF作成済み → `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` / `NEXT_PUBLIC_LIFF_ID` を登録）
- [ ] LIFF エンドポイント URL を本番 URL（https://eigotango.mtk551141.workers.dev）に更新
- [ ] Stripe 連携の有効化（`STRIPE_*` を登録 → Webhook エンドポイント登録）
- [ ] 本番 URL で全画面の動作確認（オーナー側で要確認・環境からは外部疎通不可）

## ③ 直近の完了タスク（最新 4 件・超えたら logs/CHANGELOG.md へ）

| 日付 | 内容 |
|---|---|
| 2026-06-27 | 学習画面に中断ボタン・1日の問題数を設定可能（親優先でロック）・子ども管理を再設計（端末管理/連携の2方式・親が代理学習/記録/編集/削除） |
| 2026-06-27 | メール送信を Brevo API に切り替え（BREVO_API_KEY を Cloudflare Workers に登録済み） |
| 2026-06-27 | メール通知を追加（Brevo API・LINE/メール/両方を profiles.notification_channel で切替可能） |
| 2026-06-24 | 本番 words テーブルが空で /study が即「完了」→ 50語を Management API で投入（db push がスキップされていた） |
