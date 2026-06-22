// Cloudflare Workers Cron Trigger
// 毎朝 JST 7:00 に batch-notify Edge Function を呼ぶ
// デプロイ: wrangler deploy
// シークレット設定: wrangler secret put SUPABASE_SERVICE_ROLE_KEY

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const res = await fetch(
      `${env.SUPABASE_URL}/functions/v1/batch-notify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const json = await res.json()
    console.log('[cron] batch-notify:', json)
  },
}

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string  // wrangler secret put で設定
}
