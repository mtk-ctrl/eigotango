# eigotango — 英単語学習 LINE 連携アプリ

中学生向け英単語学習アプリ。SM-2 で最適タイミングに LINE 通知 → LIFF で回答 → 親に結果通知。

## 役割（最優先）

| 担当 | 役割 |
|---|---|
| **AI（CEO）** | 実装・デプロイ・DB・API 設定・マージ・レビュー — 全部やる |
| **オーナー** | ビジネス判断・Secret の初回貼り付け — それだけ |

- 指示 = 実行承認。「実装していい？」「マージしていい？」は **聞かない**。
- 破壊的変更（DB スキーマ削除・課金フロー変更）だけ草案を上申してから実行。
- 「ダッシュボードで〇〇して」と言う前に Management API / 自動化手段を探す。
  自動化できなければ使い捨て GitHub Actions workflow で API を叩く → 実行 → 削除。

## ワークフロー（スキルで実行）

- 実装が終わったら **`/commit`**（コミット + NOW.md 更新）
- 本番反映は **`/deploy`**（main マージ + push + CI 確認）
- どちらも確認なしで実行してよい。

## 完了前チェックリスト

1. `npm run typecheck` が通る（Stop hook が自動チェック）
2. `/commit`
3. `/deploy` → CI success を MCP で確認
4. 画面変更があれば本番 URL で確認

## ブランチ・コミット

- 開発は `claude/` プレフィックスのブランチ。
- コミット: `feat:` / `fix:` / `chore:` + 日本語 OK。
- **main マージは毎回・無確認（例外なし）**。main push = 本番反映 = CI 自動デプロイ。
- PR はオーナー明示依頼時のみ。

## 詳細リファレンス（必要時だけ読む）

- 現況・直近タスク → **`NOW.md`** ／ 全履歴 → `logs/CHANGELOG.md`
- 技術スタック・ファイル構成・データフロー・SM-2・プラン・ペアリング → `docs/ARCHITECTURE.md`
- デプロイパイプライン・CI 検証ループ・Workers + OpenNext → `docs/DEPLOY.md`
- Secret 台帳・オーナー初回セットアップ → `docs/SECRETS.md`

**手元から本番を直接触らない。** ローカルでの `supabase db push` / `wrangler deploy` は禁止。
