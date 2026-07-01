# NOW — 現況・直近タスク

> セッション開始時に自動表示される（SessionStart hook）。常に最新の状態だけをここに置く。

## ① いまの状態

- フロント全画面（home / study / progress / settings / pairing / login）実装済み。
- **画面構成（IA）**: 役割別ボトムナビで「1画面1目的」。
  - 生徒: 🏠ホーム（今日やる）／📈きろく（自分の成果）／⚙️せってい。
  - 親: 🏠ホーム（こどもの様子＋自分の学習）／⚙️せってい（こども管理・各種設定）。子の記録は子カードの「きろく」から文脈で開く。
  - `/home` は役割別の着地点。旧 `/parent` ダッシュボードは `/home` に統合（リダイレクト）。学習中（`/study`）はナビ非表示の集中モード。
- **本番 URL: https://eigotango.mtk551141.workers.dev**（2026-06-24 デプロイ・500 エラー解消済み）
- **認証はメール+パスワード方式**（LINE 不要・メール送信も不要）。新規登録時に生徒/保護者を選択。
- **3パターン対応**: ①親だけ（自分で学習）②子だけ（自分のアカウント）③親子連携。
  - 親は「子どもを追加」で **端末管理の子**（ログイン不要・名前+問題数を入力）か **連携**（ペアリングコードで自分のアカウントを持つ子）を選べる。
  - 親は子の代わりに学習（`/study?child=`）・記録閲覧（`/progress?child=`）・名前/問題数編集・削除が可能。
- **1日の問題数は設定可能**（既定10語・無料最大20・プレミアム最大100）。**親が子に設定するとロック（親優先）**、本人は `/settings`（歯車）で設定。選択肢は4問含む [3,4,5,10,15,20]。
- **設定画面 `/settings`**（progress/parent の歯車から）: 復習リマインド（解き忘れ＝期限切れ復習の可視化）・1日の問題数・通知方法（メール/LINE/両方）・表示名・プラン・ログアウト。
- 学習画面に「← やめる」中断ボタンを追加（回答は保存済み）。
- **出題3モード**（SM-2 習熟段階で自動切替）: 新規=英→日4択 / rep1-2=日→英4択 / rep3+=日→英スペル入力。`lib/questions.ts`。
- **複数正解**: `words.answers_en[]`（例: たくさん→{many, a lot of}）。スペルは各候補にタイポ許容で判定、4択は誤答に同義語を混ぜない。
- **コンテンツのプラン区分**: `words.tier`（free=基本100語 / premium=高校受験・熟語含む）。無料ユーザーは free のみ出題。`is_idiom` で熟語表示。
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
| 2026-07-01 | 自己設定（出題形式/問題数/コピー見出し）変更後にrevalidatePathがなくクライアント側ルーターキャッシュで/studyに反映されないことがあったバグを修正。設定画面をセクション見出しで整理（学習/通知・アカウント/プラン/サポート）。progressページの子の学習導線に復習ボタンを追加、pairingの二重リダイレクトを解消 |
| 2026-07-01 | 出題形式（英→日4択／日→英4択／日→英スペル／自動）を設定画面から選べるように（question_mode）。誤答候補は出題語と同学年を優先して絞り込むよう修正（難易度ミスマッチ解消） |
| 2026-06-30 | 上限を整数で自由入力可能に（0/1〜プラン上限=最大100）。ホームに「復習する単語」リストを追加（コピー可）。コピー時の先頭見出しを設定可能に（copy_header・あり/なし＋文言。DailyWords/復習リスト両方に反映） |
| 2026-06-30 | 新規/復習を分離。新規は `/study`（既定3語/日・new_per_day）、復習(アクティブリコール)は `/review` に画面分割し上限も別設定（daily_goal を流用）。ホーム/設定を2系統に。getStudyWords(mode)・completeSession を session_answers から再集計＋通知1日1回に |
