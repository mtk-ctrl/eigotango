import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { jstDate } from '@/lib/date'
import { MANAGED_EMAIL_DOMAIN } from '@/lib/constants'

// 毎日のリマインドメール。Cron Worker から毎朝 1 回叩かれる。
// 復習が来ている学生本人（メール）と、端末管理の子は親のメールへ送る。
// notification_channel が 'email'|'both' のみ対象（'line'/'none' は対象外）。

interface ProfileRow {
  id: string
  email: string | null
  notification_channel: string | null
  managed_by: string | null
  display_name: string | null
  line_display_name: string | null
}

const SEND_CONCURRENCY = 20

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!process.env.BREVO_API_KEY) return NextResponse.json({ skipped: 'no BREVO_API_KEY' })

  const admin = createAdminClient()
  const today = jstDate()

  // profiles を主軸に !inner ジョインで「今日復習が必要な単語を持つユニークな学生」を DB 側で取得。
  // （user_word_progress 全件をメモリで重複排除しない）
  const { data: profs, error } = await admin
    .from('profiles')
    .select('id, email, notification_channel, managed_by, display_name, line_display_name, user_word_progress!inner(id)')
    .lte('user_word_progress.next_review_date', today)
  if (error) {
    console.error('[daily-reminder] query failed:', error)
    return NextResponse.json({ error: 'query failed' }, { status: 500 })
  }
  const students = (profs ?? []) as unknown as ProfileRow[]

  const wantsEmail = (ch: string | null) => ch === 'email' || ch === 'both'
  const realEmail = (e: string | null): e is string => !!e && !e.endsWith(MANAGED_EMAIL_DOMAIN)
  const nameOf = (p: ProfileRow) => p.line_display_name ?? p.display_name ?? 'お子さま'

  // 宛先 { email, name }（name=null は本人宛の汎用文面）
  const targets: { email: string; name: string | null }[] = []

  // (1) 本人ログインの学生 → 本人のメールへ
  for (const s of students) {
    if (s.managed_by) continue
    if (!wantsEmail(s.notification_channel ?? 'email')) continue
    if (!realEmail(s.email)) continue
    targets.push({ email: s.email, name: null })
  }

  // (2) 端末管理の子 → 親のメールへ「○○さんの〜」
  const managedKids = students.filter(s => s.managed_by)
  if (managedKids.length > 0) {
    const parentIds = [...new Set(managedKids.map(s => s.managed_by as string))]
    const { data: parents } = await admin
      .from('profiles')
      .select('id, email, notification_channel')
      .in('id', parentIds)
    const parentMap = new Map((parents ?? []).map(p => [p.id, p]))
    for (const kid of managedKids) {
      const parent = parentMap.get(kid.managed_by as string)
      if (!parent || !wantsEmail(parent.notification_channel ?? 'email')) continue
      if (!realEmail(parent.email)) continue
      targets.push({ email: parent.email, name: nameOf(kid) })
    }
  }

  // 本番のカスタムドメインを優先。未設定時のみリクエスト元オリジンにフォールバック
  // （内部ルーティング/プレビュードメイン経由で誤ったリンクになるのを防ぐ。個人URLのハードコードはしない）
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

  // チャンクごとに並列送信（直列の RTT 累積でタイムアウトするのを防ぐ）
  let sent = 0
  for (let i = 0; i < targets.length; i += SEND_CONCURRENCY) {
    const batch = targets.slice(i, i + SEND_CONCURRENCY)
    const results = await Promise.all(
      batch.map(t =>
        sendEmail({
          to: t.email,
          subject: t.name ? `${t.name}さんの今日の英単語が届いています📚` : '今日の英単語が届いています📚',
          html: buildReminderHtml(appUrl, t.name),
        }).catch(() => false),
      ),
    )
    sent += results.filter(Boolean).length
  }

  return NextResponse.json({ targets: targets.length, sent })
}

function buildReminderHtml(appUrl: string, childName: string | null): string {
  const heading = childName
    ? `${childName}さんの今日の英単語が届いています！`
    : '今日の英単語が届いています！'
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#22a559;padding:24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">英語タンゴ 📚</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#333;margin-top:0;">${heading}</h2>
      <p style="color:#666;line-height:1.6;">毎日続けると着実に覚えられるよ 📖</p>
      <div style="text-align:center;margin-top:32px;">
        <a href="${appUrl}/study" style="display:inline-block;background:#22a559;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">学習を始める →</a>
      </div>
    </div>
    <div style="background:#f9f9f9;padding:16px;text-align:center;color:#999;font-size:12px;">
      英語タンゴ — 中学生向け英単語学習アプリ
    </div>
  </div>
</body></html>`
}
