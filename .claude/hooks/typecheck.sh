#!/usr/bin/env bash
# Stop hook: ターン終了時、TS の変更があれば typecheck を回す。
# 失敗したら exit 2 で stderr を Claude に返し、修正させてから終わらせる。
# 変更が無い / 依存未インストールのターンはスキップして速度とトークンを節約する。
set -u

[ -d node_modules ] || exit 0

# 作業ツリー or ステージに .ts/.tsx の変更が無ければスキップ
if ! git diff --name-only HEAD 2>/dev/null | grep -qE '\.tsx?$'; then
  exit 0
fi

if out=$(npm run --silent typecheck 2>&1); then
  exit 0
fi

{
  echo "typecheck が失敗しています。完了とする前に直してください:"
  printf '%s\n' "$out" | tail -25
} >&2
exit 2
