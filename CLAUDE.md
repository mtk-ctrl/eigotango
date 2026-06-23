# eigotango - 英単語学習 LINE 連携アプリ

## 概要
中学生向け英単語学習アプリ。SM-2アルゴリズムで最適タイミングにLINE通知 → LIFFアプリで回答 → 親に結果通知。

## 技術スタック
| レイヤー | 技術 |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind CSS → Cloudflare Pages |
| Backend/DB | Supabase (PostgreSQL + Auth + Edge Functions) |
| 通知 | LINE Messaging API (LIFF + Messaging API) |
| 認証 | LINE Login (LIFF) → Supabase Auth |
| 決済 | Stripe Checkout |
| Cron | Cloudflare Workers Cron Triggers → Edge Function |

## ファイル構成（省トークン設計：1ファイル1責務）

```
src/
├── types/
│   ├── database.ts      # DB テーブルの型（全テーブル）
│   └── api.ts           # API req/res の型
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # ブラウザ用クライアント
│   │   └── server.ts    # サーバー用クライアント
│   ├── sm2.ts           # SM-2アルゴリズム（純粋関数）
│   └── liff.ts          # LIFF 初期化ユーティリティ
├── app/
│   ├── (liff)/          # LIFFアプリのルート群（認証必須）
│   │   ├── study/       # 子ども: 今日の学習（メイン機能）
│   │   ├── progress/    # 子ども: 学習進捗
│   │   ├── parent/      # 親: ダッシュボード
│   │   └── pairing/     # 親子紐付け
│   ├── login/           # LINE ログインページ
│   └── api/
│       ├── line/webhook/    # LINE Webhook（署名検証必須）
│       └── stripe/webhook/  # Stripe Webhook（署名検証必須）
├── components/
│   ├── study/           # WordCard, AnswerButtons など
│   └── ui/              # Button, Card など汎用部品
└── middleware.ts        # Supabase Auth セッション更新

supabase/
├── migrations/          # 番号順に実行
├── functions/
│   ├── batch-notify/    # 毎日の問題送信（Cron から呼ばれる）
│   └── stripe-webhook/  # Stripe Webhook（Edge Function版）
└── seed.sql             # テスト用 50 語
```

## 主要データフロー

```
【毎日の通知】
Cloudflare Workers Cron → batch-notify Edge Function
→ user_word_progress WHERE next_review_date <= today を抽出
→ LINE Messaging API で各ユーザーに LIFF リンク付き通知

【回答フロー】
LINE 通知 → タップ → LIFF 起動 → study ページで回答
→ /api/study-answer (Server Action) → SM-2計算 → DB更新
→ セッション完了 → 親の LINE に結果通知

【課金】
LIFF 内 Stripe Checkout → stripe-webhook → subscriptions 更新
```

## SM-2 品質スコア（UIは3択）
| UI の選択 | quality 値 |
|---|---|
| 知ってた！ | 5 |
| なんとなく | 3 |
| 知らなかった | 1 |

`src/lib/sm2.ts` の `QUALITY_MAP` を参照。

## プラン制限
- 無料: 20語/日（`batch-notify` でLIMITを切り替え）
- プレミアム: 無制限 + 親への詳細レポート
- 判定: `subscriptions.plan` を `student → parent → subscription` でJOIN

## 環境変数（.env.local.example 参照）
必須:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（サーバー・Edge Function のみ）
- `NEXT_PUBLIC_LIFF_ID`
- `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID`

## ペアリング方式
6桁コード方式: 親がダッシュボードでコード生成 → 子どもが LIFF 上で入力。
`student_parent_relations.pairing_code` に保存（24時間有効）。

---

## 開発ルール（AI自動化の大原則）

### オーナー作業は最小化する
オーナーが手動でやるのは **物理的に不可能な初回登録だけ**:
- (a) APIキー等の秘密情報の初回登録（GitHub Secrets / Cloudflare環境変数への貼り付け）
- (b) Stripe の商品・価格の管理画面設定（APIでは価格作成後の変更不可のため）
- (c) LINE Developers / Supabase の初回プロジェクト作成（UIのみ）

それ以外は **AI が全部やる**。「ダッシュボードで○○して」と言う前に必ずAPIを探す。

### デプロイ・反映はすべて push → CI の一本道

| 変更対象 | トリガー | 自動処理 | 検証 |
|---|---|---|---|
| `src/` (フロント) | main へ push | Cloudflare Pages 自動ビルド | 本番URL確認 |
| `supabase/functions/` | main へ push | CI が `supabase functions deploy` | CI run = success |
| `supabase/migrations/` | main へ push | CI が `supabase db push` | CI run = success |
| `cloudflare/` (Cron Worker) | main へ push | CI が `wrangler deploy` | CI run = success |
| Auth/Webhook等の設定変更 | 使い捨て CI workflow | Management API を呼ぶ → 実行 → 削除 | CI run = success |

**手元から本番を直接触らない。** ローカルでの `supabase db push` や `wrangler deploy` は禁止。

### CI 後の検証ループ（必須）
1. push 後、GitHub Actions の最新 run を MCP で取得する
2. `conclusion = "success"` を確認してから「完了しました」と報告する
3. 失敗したらジョブログを取得 → 原因修正 → 再 push（緑になるまでループ）

### Secret の置き場所（コードには絶対書かない）

#### GitHub Secrets（CI デプロイ用）
| Secret 名 | 用途 |
|---|---|
| `SUPABASE_PROJECT_REF` | Supabase プロジェクト参照ID（URLのサブドメイン部分） |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI 認証（supabase.com → Account → Access Tokens） |
| `SUPABASE_DB_PASSWORD` | DB マイグレーション実行用パスワード（Supabase → Settings → Database） |
| `LINE_CHANNEL_ACCESS_TOKEN` | Edge Function シークレットとして自動同期 |
| `LINE_CHANNEL_SECRET` | Edge Function シークレットとして自動同期 |
| `CLOUDFLARE_API_TOKEN` | Wrangler デプロイ用（Cloudflare → API Tokens → Edit Cloudflare Workers） |
| `CLOUDFLARE_ACCOUNT_ID` | Wrangler デプロイ先アカウント |

#### Cloudflare Pages 環境変数（Next.js ランタイム用）
Cloudflare Pages ダッシュボード → Settings → Environment variables で設定:
| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公開鍵 |
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF ID |
| `NEXT_PUBLIC_APP_URL` | 本番 URL（例: https://eigotango.pages.dev） |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Action 用 RLS バイパス鍵 |
| `LINE_CHANNEL_SECRET` | LINE Webhook 署名検証 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Push 送信 |
| `STRIPE_SECRET_KEY` | Stripe Checkout 作成 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 署名検証 |
| `STRIPE_PREMIUM_PRICE_ID` | プレミアムプランの Price ID |

#### Cloudflare Worker シークレット（Cron Worker 用）
Cloudflare ダッシュボードで設定（またはオーナーが `wrangler secret put` を初回実行）:
| シークレット名 | 用途 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | batch-notify から Supabase を叩くための鍵 |

Secret の **値はこのファイルに書かない**。置き場所だけ上記に記録する。

### オーナーの初回セットアップ手順（これだけやれば後は全自動）

1. **GitHub Secrets を登録**（リポジトリ → Settings → Secrets and variables → Actions）
   - 上記テーブルの「GitHub Secrets」欄にある7項目を貼り付ける

2. **Cloudflare Pages を GitHub と連携**
   - Cloudflare ダッシュボード → Pages → Create a project → Connect to Git
   - リポジトリを選択、ビルドコマンド: `npm run build`、出力: `.next`
   - 上記テーブルの「Cloudflare Pages 環境変数」欄の10項目を設定

3. **Cloudflare Worker のシークレット設定**
   - Cloudflare ダッシュボード → Workers → eigotango-cron → Settings → Variables
   - `SUPABASE_SERVICE_ROLE_KEY` を追加

4. **main にマージ → 以後は全自動**
   - DB マイグレーション、Edge Function、Cron Worker が CI で自動デプロイされる

### 設定変更を API で自動化できない場合
ローカルから叩けない設定（Secret が CI 側にしかない等）は
「使い捨て GitHub Actions workflow を作って API を呼ぶ → 実行 → 削除」で実現する。

例:
- Supabase Auth の Email テンプレート変更 → Management API PATCH
- LINE Webhook URL の登録 → LINE Messaging API Channel Endpoint API
- Stripe Webhook エンドポイント登録 → Stripe API POST /v1/webhook_endpoints

### 新しい外部サービスを追加する手順
1. **調査**: REST/Management API と認証方式を特定（まず API を探す）
2. **Secret 登録**: 機密情報だけオーナーに1回貼ってもらう。以降は AI が操作
3. **実装**: 呼び出しはサーバ側（Edge Function / Server Action）に寄せ、鍵を露出させない
4. **反映**: push → CI で自動デプロイ
5. **検証**: CI success ＋ 実応答で確認
6. **台帳化**: Secret の置き場所だけ上記テーブルに1行追記（値は書かない）

### 未接続サービスの扱い（開発を止めない）
- バックエンド未接続時はモック実装で全画面が動く設計にする
- 「後回し」のサービスはコードを先に実装済みにし、Secret 投入だけで有効化される状態にする
- 例: Stripe 未設定 → Checkout URL 生成が失敗してもUIは表示される

### ブランチ・コミット運用
- 開発は `claude/` プレフィックスのブランチで行う
- コミットメッセージは日本語 OK、`feat:` / `fix:` / `chore:` プレフィックス付き
- main へのマージ = 本番反映（CI が全自動でデプロイ）
- PR はオーナーから明示的に依頼があった時だけ作成する

# CLAUDE.md — nigatenote 運用ルール

中学受験「苦手ノート自動作成＆復習リマインド」Webアプリ。
**矛盾する場合は本サービスのルールを最優先。**

## コア価値
- 親は「撮影＋日付/備考」「○×＋日付/備考」を送るだけ。OCR・タグ付け・ノート生成・リマインド・類題・無料枠管理は全部自動。
- 差別化: 単元が違っても本質的な解法（線分図・面積図等）は同じと気付かせるサジェスト。

## 参照（必要時だけ読む）
- **デプロイ／認証情報／Stripe** → `docs/DEPLOY.md`
- **技術スタック／Gemini／DB設計** → `docs/ARCHITECTURE.md`
- **外部サービス接続手順** → `docs/SETUP.md`
- **現況・直近タスク** → `NOW.md` ／ 全履歴 → `logs/CHANGELOG.md`

## 技術スタック
Vite + Supabase (PostgreSQL/Auth/Storage/Edge Functions) + Cloudflare Pages + Gemini API
- 主モデル: `gemini-3.5-flash` / フォールバック: `gemini-3.5-flash-lite`（環境変数でピン留め）
- デプロイ: `main` push → GitHub Actions 自動実行

## スキルコマンド（必ず使う）
| コマンド | タイミング |
|---|---|
| `/commit` | 実装完了時（コミット＋NOW.md更新を一括実行） |
| `/deploy` | 本番反映時（main マージ＋push＋Actions確認） |
| `/screen-review` | 画面変更後（ビルド＋スクショ＋親目線確認） |

サブエージェント:
- `code-reviewer`: コード・セキュリティレビュー（中規模以上の実装後）
- `ux-reviewer`: 親目線UXレビュー（画面変更後）

## ルール

### AIにできることをオーナーに依頼しない（絶対）
コード変更・デプロイ・DB操作・API呼び出し・設定変更は全て自分で実行。「ダッシュボードで〇〇してください」と言う前に Management API や自動化手段を探す。

### 実装は確認なく即実行（IMPORTANT）
- 実装してよいか聞かない。オーナーからの改修指示はGO確定。即実装 → `/commit` → `/deploy`。
- DB設計変更・破壊的変更・課金フローのみ草案を上申してから実装する。

### 完了前の確認（IMPORTANT）
1. ビルドが通ること（PostToolUse hook が自動チェック）
2. 画面変更があれば `/screen-review` で親目線確認
3. `/commit` でコミット＋NOW.md更新
4. 本番反映が必要なら `/deploy` で main へ push

### main への反映は毎回・無確認（最優先・例外なし）
改修指示＝マージ承認＝本番反映の承認。「反映してよいか」は聞かない。
feature ブランチで作業した場合も最後に必ず main へマージして push する。
止めてよいのは「物理的に push 権限がない」場合のみ。
