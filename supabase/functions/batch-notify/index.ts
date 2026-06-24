// Supabase Edge Function (Deno)
// 毎朝 Cloudflare Workers Cron から呼ばれる
// 今日復習が必要な学生に LINE で通知を送る

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LINE_MULTICAST_URL = 'https://api.line.me/v2/bot/message/multicast'
const LINE_BATCH_SIZE = 500  // LINE API の1リクエスト上限

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const today = new Date().toISOString().split('T')[0]
  const appUrl = Deno.env.get('APP_URL') ?? 'https://eigotango.mtk551141.workers.dev'
  const lineToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!

  // 今日復習が必要な学生の line_user_id を抽出（重複なし）
  const { data: rows, error } = await supabase
    .from('user_word_progress')
    .select('student_id, profiles!inner(line_user_id)')
    .lte('next_review_date', today)
    .not('profiles.line_user_id', 'is', null)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const lineUserIds = [
    ...new Set(
      (rows ?? [])
        .map((r) => (r.profiles as { line_user_id: string }).line_user_id)
        .filter(Boolean)
    ),
  ]

  if (lineUserIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Flex Message: 学習開始ボタン付き
  const message = {
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

  // 500件ずつバッチ送信
  let sent = 0
  for (let i = 0; i < lineUserIds.length; i += LINE_BATCH_SIZE) {
    const batch = lineUserIds.slice(i, i + LINE_BATCH_SIZE)
    const res = await fetch(LINE_MULTICAST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({ to: batch, messages: [message] }),
    })
    if (res.ok) sent += batch.length
    else console.error('[batch-notify] LINE error:', await res.text())
  }

  return new Response(JSON.stringify({ sent, total: lineUserIds.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
