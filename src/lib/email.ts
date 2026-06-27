// メール送信ユーティリティ（Brevo API 使用・サーバー専用）

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY が未設定のためスキップ')
    return
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL ?? 'mtk551141@gmail.com'
  const fromName = process.env.BREVO_FROM_NAME ?? '英語タンゴ'

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    console.error('[email] 送信失敗:', await res.text())
  }
}

export function buildParentNotificationHtml({
  name,
  correctCount,
  totalCount,
  pct,
}: {
  name: string
  correctCount: number
  totalCount: number
  pct: number
}): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>学習完了のお知らせ</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#4F8EF7;padding:24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">英語タンゴ 📚</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#333;margin-top:0;">📊 ${name}さんの学習が完了しました！</h2>
      <div style="background:#f0f7ff;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:8px 0;color:#333;font-size:16px;">✅ 正解: <strong>${correctCount} / ${totalCount}語</strong></p>
        <p style="margin:8px 0;color:#333;font-size:16px;">📈 正答率: <strong>${pct}%</strong></p>
      </div>
      <p style="color:#666;text-align:center;font-size:18px;">よく頑張りました 👏</p>
    </div>
    <div style="background:#f9f9f9;padding:16px;text-align:center;color:#999;font-size:12px;">
      英語タンゴ — 中学生向け英単語学習アプリ
    </div>
  </div>
</body>
</html>`
}
