// Cloudflare Workers Cron Trigger
// 毎朝 JST 7:00 に Next の API ルートを呼ぶ:
//  (1) /api/cron/daily-reminder  … 毎日のリマインドメール
//  (2) /api/cron/feedback-digest … フィードバック日次ダイジェスト
// いずれも APP_URL（本番アプリ）経由なので Edge Function のデプロイ可否に依存しない。
// デプロイ: wrangler deploy / シークレット: wrangler secret put SUPABASE_SERVICE_ROLE_KEY

async function callApi(env: Env, path: string, label: string) {
  try {
    const res = await fetch(`${env.APP_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    })
    // fetch は 4xx/5xx で throw しないため res.ok を明示チェック
    if (!res.ok) {
      console.error(`[cron] ${label} HTTP`, res.status, await res.text())
    } else {
      console.log(`[cron] ${label}:`, await res.json())
    }
  } catch (e) {
    console.error(`[cron] ${label} failed:`, e)
  }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    if (!env.APP_URL) {
      console.error('[cron] APP_URL 未設定')
      return
    }
    await callApi(env, '/api/cron/daily-reminder', 'daily-reminder')
    await callApi(env, '/api/cron/feedback-digest', 'feedback-digest')
  },
}

interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string  // wrangler secret put で設定
  APP_URL: string                    // 本番アプリ URL（wrangler vars）
}
