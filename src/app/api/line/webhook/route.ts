import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// LINE Webhook 署名検証
function verifySignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET!)
    .update(body)
    .digest('base64')
  return expected === signature
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
      // ユーザーがBotを友達追加
      // LIFFログイン時に line_user_id を紐付けるため、ここでは記録のみ
      console.log('[webhook] follow:', event.source.userId)
    }
    // その他のイベントは現在未使用（回答はLIFF上で行う）
  }

  return NextResponse.json({ ok: true })
}

interface LineEvent {
  type: string
  source: { userId: string }
  replyToken?: string
}
