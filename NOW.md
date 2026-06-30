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
| 2026-06-30 | ホームの単語リストに「学習した」ボタン追加（markDailyLearned）。手元で覚えた語を初回学習済み＝翌日から復習(アクティブリコール)に回す・設定数の上限なし。「昨日」を前日(JST)初回学習に日付固定し今日との重複を解消 |
| 2026-06-30 | 未学習語抽出を RPC `get_unstudied_words`（DB側アンチジョイン）に移行。PostgREST 1000件上限・NOT IN肥大化・全件メモリ処理の問題を解消（getTodayStudyWords/getUpcomingWords/getDailyWords）。学習フローのエラー耐性も補強 |
| 2026-06-30 | 出題された語をスキップ候補一覧から自動除外（recordAnswer で revalidate）。学習結果画面で正解時に「もうこの単語は覚えてる」ボタン追加→今後のアクティブリコール対象から除外 |
| 2026-06-28 | フィードバック機能を追加（設定→不具合/要望/その他＋画像添付）。feedbackテーブル＋画像バケット新設、オーナーへメール通知。設定にログアウト復活。配色をセマンティクスで統一・JST日付バグ等の指摘修正 |
