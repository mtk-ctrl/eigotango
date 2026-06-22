// LINE Messaging API ユーティリティ（サーバー専用）

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push'

interface LineTextMessage {
  type: 'text'
  text: string
}

type LineMessage = LineTextMessage

export async function sendLinePushMessage(
  to: string,
  messages: LineMessage[],
): Promise<void> {
  const res = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages }),
  })
  if (!res.ok) {
    console.error('[LINE push] failed:', await res.text())
  }
}
