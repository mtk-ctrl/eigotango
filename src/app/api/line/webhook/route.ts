import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { linkLineAccount } from '@/app/actions/auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://eigotango.mtk551141.workers.dev'

function verifySignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET!)
    .update(body)
    .digest('base64')
  return expected === signature
}

async function replyToLine(replyToken: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token || !replyToken) return
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { events } = JSON.parse(body) as { events: LineEvent[] }

  for (const event of events) {
    if (event.type === 'follow') {
      // 友達追加時：ウェブアプリへの案内を送る
      await replyToLine(
        event.replyToken ?? '',
        `英語タンゴへようこそ！📚\n\nまずウェブアプリにログインしてください：\n${APP_URL}/login\n\nログイン後、このLINEに「メールアドレス」を送ると LINE 通知が有効になります。`
      )
    }

    if (event.type === 'message' && event.message?.type === 'text') {
      const text = event.message.text.trim()
      // メールアドレスが送られてきたら LINE アカウントと連携
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        const result = await linkLineAccount(text, event.source.userId, event.source.userId)
        if (result.ok) {
          await replyToLine(event.replyToken ?? '', '✅ LINE 連携が完了しました！\n毎朝 7:00 に学習通知が届きます。')
        } else if (result.reason === 'user_not_found') {
          await replyToLine(event.replyToken ?? '', `⚠️ ${text} のアカウントが見つかりませんでした。\nまずウェブアプリに登録してください：${APP_URL}/login`)
        } else {
          await replyToLine(event.replyToken ?? '', '❌ 連携に失敗しました。もう一度お試しください。')
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}

interface LineEvent {
  type: string
  source: { userId: string }
  replyToken?: string
  message?: { type: string; text: string }
}
