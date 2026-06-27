// Supabase Edge Function (Deno)
// 毎朝 Cloudflare Workers Cron から呼ばれる
// 今日復習が必要な学生に LINE または メールで通知を送る

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LINE_MULTICAST_URL = 'https://api.line.me/v2/bot/message/multicast'
const LINE_BATCH_SIZE = 500

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const today = new Date().toISOString().split('T')[0]
  const appUrl = Deno.env.get('APP_URL') ?? 'https://eigotango.mtk551141.workers.dev'
  const lineToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const resendFrom = Deno.env.get('RESEND_FROM') ?? 'onboarding@resend.dev'

  // 今日復習が必要な学生を取得（通知チャネル・メール・LINE ID 含む）
  const { data: rows, error } = await supabase
    .from('user_word_progress')
    .select('student_id, profiles!inner(line_user_id, email, notification_channel)')
    .lte('next_review_date', today)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  // 学生ごとに通知先を集約（重複なし）
  const studentMap = new Map<string, {
    line_user_id: string | null
    email: string | null
    channel: string
  }>()
  for (const row of rows ?? []) {
    if (studentMap.has(row.student_id)) continue
    const p = row.profiles as { line_user_id: string | null; email: string | null; notification_channel: string }
    studentMap.set(row.student_id, {
      line_user_id: p.line_user_id,
      email: p.email,
      channel: p.notification_channel ?? 'email',
    })
  }

  const students = [...studentMap.values()]

  // LINE 通知対象
  const lineUserIds = students
    .filter(s => (s.channel === 'line' || s.channel === 'both') && s.line_user_id)
    .map(s => s.line_user_id as string)

  // メール通知対象
  const emailTargets = students
    .filter(s => (s.channel === 'email' || s.channel === 'both') && s.email)
    .map(s => s.email as string)

  let lineSent = 0
  let emailSent = 0

  // LINE バッチ送信（LINE_CHANNEL_ACCESS_TOKEN が設定されている場合のみ）
  if (lineToken && lineUserIds.length > 0) {
    const lineMessage = buildLineMessage(appUrl)
    for (let i = 0; i < lineUserIds.length; i += LINE_BATCH_SIZE) {
      const batch = lineUserIds.slice(i, i + LINE_BATCH_SIZE)
      const res = await fetch(LINE_MULTICAST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lineToken}`,
        },
        body: JSON.stringify({ to: batch, messages: [lineMessage] }),
      })
      if (res.ok) lineSent += batch.length
      else console.error('[batch-notify] LINE error:', await res.text())
    }
  }

  // メール送信（RESEND_API_KEY が設定されている場合のみ）
  if (resendKey && emailTargets.length > 0) {
    const subject = '今日の英単語が届いています📚'
    const html = buildStudentEmailHtml(appUrl)
    for (const email of emailTargets) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({ from: resendFrom, to: email, subject, html }),
      })
      if (res.ok) emailSent++
      else console.error('[batch-notify] email error:', email, await res.text())
    }
  }

  return new Response(
    JSON.stringify({ lineSent, emailSent, total: students.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})

function buildLineMessage(appUrl: string) {
  return {
    type: 'flex',
    altText: '今日の英語学習が届いています📚',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#00C300',
        paddingAll: 'xl',
        contents: [
          { type: 'text', text: '英語タンゴ', weight: 'bold', size: 'xl', color: '#ffffff' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '今日の英単語が届いています！',
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'text',
            text: '毎日続けると着実に覚えられるよ 📖',
            size: 'sm',
            color: '#888888',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#00C300',
            height: 'sm',
            action: {
              type: 'uri',
              label: '学習を始める →',
              uri: `${appUrl}/study`,
            },
          },
        ],
      },
    },
  }
}

function buildStudentEmailHtml(appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>今日の英単語が届いています</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#4F8EF7;padding:24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">英語タンゴ 📚</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#333;margin-top:0;">今日の英単語が届いています！</h2>
      <p style="color:#666;line-height:1.6;">毎日続けると着実に覚えられるよ 📖</p>
      <div style="text-align:center;margin-top:32px;">
        <a href="${appUrl}/study"
           style="display:inline-block;background:#4F8EF7;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          学習を始める →
        </a>
      </div>
    </div>
    <div style="background:#f9f9f9;padding:16px;text-align:center;color:#999;font-size:12px;">
      英語タンゴ — 中学生向け英単語学習アプリ
    </div>
  </div>
</body>
</html>`
}
