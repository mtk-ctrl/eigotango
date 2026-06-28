import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

// フィードバックの日次ダイジェスト。Cron Worker から毎朝 1 回叩かれる。
// status='new' を集約して 1 通だけオーナーへ送信し、送信できたら 'read' に更新する。

const LABEL: Record<string, string> = { bug: '不具合', request: '要望', other: 'その他' }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface Row {
  id: string
  category: string
  message: string
  email: string | null
  role: string | null
  image_url: string | null
  created_at: string
}

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // メール未設定なら既読化せず保留（データは feedback テーブルに残る）
  if (!process.env.BREVO_API_KEY) return NextResponse.json({ skipped: 'no BREVO_API_KEY' })

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('feedback')
    .select('id, category, message, email, role, image_url, created_at')
    .eq('status', 'new')
    .order('created_at', { ascending: true })
    .limit(500)

  const items = (rows ?? []) as Row[]
  if (items.length === 0) return NextResponse.json({ count: 0 })

  const to = process.env.FEEDBACK_TO_EMAIL ?? process.env.BREVO_FROM_EMAIL ?? 'mtk551141@gmail.com'
  await sendEmail({
    to,
    subject: `【フィードバック日次】新着 ${items.length} 件`,
    html: buildDigestHtml(items),
  })

  await admin.from('feedback').update({ status: 'read' }).in('id', items.map(r => r.id))
  return NextResponse.json({ count: items.length })
}

function buildDigestHtml(rows: Row[]): string {
  const blocks = rows.map(r => {
    const when = new Date(r.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    const img = r.image_url
      ? `<p style="margin:6px 0;"><a href="${r.image_url}" style="color:#22a559;">添付画像</a></p>`
      : ''
    return `<div style="border:1px solid #eee;border-radius:8px;padding:14px;margin:0 0 12px;">
      <p style="margin:0 0 6px;"><span style="background:#eafaf0;color:#22a559;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:bold;">${LABEL[r.category] ?? r.category}</span>
      <span style="color:#aaa;font-size:12px;margin-left:8px;">${when}</span></p>
      <p style="white-space:pre-wrap;color:#222;font-size:14px;line-height:1.6;margin:6px 0;">${escapeHtml(r.message)}</p>
      ${img}
      <p style="color:#999;font-size:11px;margin:6px 0 0;">${escapeHtml(r.email ?? '不明')}（${escapeHtml(r.role ?? '不明')}）</p>
    </div>`
  }).join('')

  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#22a559;padding:20px 24px;">
      <h1 style="color:white;margin:0;font-size:18px;">フィードバック日次ダイジェスト（${rows.length}件）</h1>
    </div>
    <div style="padding:24px;">${blocks}</div>
  </div>
</body></html>`
}
