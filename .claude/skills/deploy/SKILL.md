---
name: deploy
description: 作業ブランチを main へマージし本番反映する。CI を確認するまで行う。「デプロイ」「deploy」「本番反映」「マージして」などで起動。
---

# deploy

main マージ = 本番反映 = CI 自動デプロイ。確認なしで実行してよい（オーナーへの可否確認は不要）。

## 手順

1. 未コミットの変更があれば先に `/commit` を実行（なければスキップ）。
2. 作業ブランチを push: `git push -u origin <作業ブランチ>`。
   - ネットワークエラー時のみ 2s→4s→8s→16s でリトライ。
3. GitHub MCP で main へマージ（リモート環境ではこの経路が確実）:
   - `mcp__github__create_pull_request`（owner: `mtk-ctrl`, repo: `eigotango`, base: `main`, head: 作業ブランチ）
   - `mcp__github__merge_pull_request`（`merge_method: "squash"`）
   - PR はマージ手段として使う。オーナー宛のレビュー依頼 PR を別途作らない。
4. ローカルを同期: `git fetch origin main && git merge origin/main`。
5. CI を確認（DB / Edge Function / Cron / 設定変更を含む場合は必須）:
   - `mcp__github__actions_list`（method: `list_workflow_runs`, branch: `main`）で最新 run を取得。
   - `conclusion = "success"` を確認するまで待つ。失敗したら `mcp__github__get_job_logs` で原因を見て修正 → 再 push（緑になるまでループ）。
   - **フロント（`src/` のみ）の変更は Cloudflare 直結ビルドなので GitHub Actions の確認は不要。** 本番 URL で確認する。
6. マージした commit と変更内容、CI の結果を報告。

push が 403 / 権限エラーなら、オーナーへ「push 権限がないため main 反映ができない」と作業ブランチ名を添えて報告する。
