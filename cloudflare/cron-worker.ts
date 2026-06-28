// Cloudflare Workers Cron Trigger
// 毎朝 JST 7:00 に (1) batch-notify Edge Function（学習リマインド）と
// (2) フィードバック日次ダイジェスト（Next API ルート）を呼ぶ。
// デプロイ: wrangler deploy
// シークレット設定: wrangler secret put SUPABASE_SERVICE_ROLE_KEY

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    // (1) 学習リマインド
    try {
      const res = await fetch(`${env.SUPABASE_URL}/functions/v1/batch-notify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      })
      console.log('[cron] batch-notify:', await res.json())
    } catch (e) {
      console.error('[cron] batch-notify failed:', e)
    }

    // (2) フィードバック日次ダイジェスト（オーナーへ1通）
    if (env.APP_URL) {
      try {
        const res = await fetch(`${env.APP_URL}/api/cron/feedback-digest`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
        })
        console.log('[cron] feedback-digest:', await res.json())
      } catch (e) {
        console.error('[cron] feedback-digest failed:', e)
      }
    }
  },
}

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string  // wrangler secret put で設定
  APP_URL: string                    // 本番アプリ URL（wrangler vars）
}
