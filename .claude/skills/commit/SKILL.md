---
name: commit
description: 変更をコミットし NOW.md を更新する。実装が一区切りついたら使う。「コミットして」「commit」「実装完了」などで起動。
---

# commit

実装が一区切りついたら確認なしで実行する。$ARGUMENTS があればコミットメッセージのヒントに使う。

## 手順

1. `npm run typecheck` が通ることを確認（Stop hook でも自動チェックされる）。失敗したら直してから続行。
2. `git status --short` と `git diff --stat` で変更を確認。
3. 変更を 1〜2 行の日本語に要約し、`feat:` / `fix:` / `chore:` を付けてコミットメッセージを作る。
4. 関係ファイルを `git add` してステージング。
5. `git commit` する。コミットメッセージ末尾に必ず付ける:
   ```
   Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_016xiseuu3v5fEBn87iUFHgA
   ```
6. `NOW.md` を更新する:
   - 「③ 直近の完了タスク」テーブルの先頭に `| YYYY-MM-DD | <要約> |` を追加。
   - 4 件を超えたら最古の行を `logs/CHANGELOG.md` の先頭へ移し、NOW.md は 4 件以内に保つ。
   - 完了した「② 次にやること」のチェックボックスを `[x]` にする / 状態が変わったら「① いまの状態」を更新。
7. `git add NOW.md logs/CHANGELOG.md && git commit -m "chore: NOW.md 更新"`（同じ末尾フッターを付ける）。
8. コミットした hash と内容を 1 行で報告。

本番反映まで行うなら続けて `/deploy` を呼ぶ。
