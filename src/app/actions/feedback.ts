'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const CATEGORIES = ['bug', 'request', 'other'] as const
type Category = (typeof CATEGORIES)[number]

const LABEL: Record<Category, string> = {
  bug: '不具合の報告',
  request: '改善の要望',
  other: 'その他',
}

// フィードバック（不具合報告・改善要望）を受け取り、DB 保存 + オーナーへメール通知。
// 大量到来に備え、保存先は feedback テーブル（一次データ）。通知はベストエフォート。
export async function submitFeedback(formData: FormData): Promise<{ ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ログインが必要です')

  const categoryRaw = String(formData.get('category') ?? 'other')
  const category: Category = (CATEGORIES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as Category)
    : 'other'
  const message = String(formData.get('message') ?? '').trim()
  const userAgent = String(formData.get('userAgent') ?? '').slice(0, 500)

  if (!message) throw new Error('内容を入力してください')
  if (message.length > 2000) throw new Error('内容は2000文字以内で入力してください')

  const admin = createAdminClient()

  // 画像アップロード（任意・5MBまで・画像のみ）
  let imageUrl: string | null = null
  const file = formData.get('image')
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選択してください')
    if (file.size > MAX_IMAGE_BYTES) throw new Error('画像は5MB以内にしてください')
    const ext = (file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await admin.storage
      .from('feedback')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) throw new Error('画像のアップロードに失敗しました')
    imageUrl = admin.storage.from('feedback').getPublicUrl(path).data.publicUrl
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role, email, display_name, line_display_name')
    .eq('id', user.id)
    .single()

  const { error: insErr } = await admin.from('feedback').insert({
    user_id: user.id,
    email: profile?.email ?? user.email ?? null,
    role: profile?.role ?? null,
    category,
    message,
    image_url: imageUrl,
    user_agent: userAgent || null,
  })
  if (insErr) throw new Error('送信に失敗しました。時間をおいて再試行してください。')

  // オーナーへ通知（失敗してもユーザーの送信は成功扱い）
  try {
    const to = process.env.FEEDBACK_TO_EMAIL ?? process.env.BREVO_FROM_EMAIL ?? 'mtk551141@gmail.com'
    const fromName = profile?.line_display_name ?? profile?.display_name ?? '名前未設定'
    await sendEmail({
      to,
      subject: `【フィードバック / ${LABEL[category]}】${message.slice(0, 24)}`,
      html: buildFeedbackHtml({
        label: LABEL[category],
        message,
        imageUrl,
        fromName,
        email: profile?.email ?? user.email ?? '不明',
        role: profile?.role ?? '不明',
      }),
    })
  } catch (e) {
    console.error('[feedback] owner notify failed:', e)
  }

  return { ok: true }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildFeedbackHtml({
  label, message, imageUrl, fromName, email, role,
}: {
  label: string; message: string; imageUrl: string | null; fromName: string; email: string; role: string
}): string {
  const img = imageUrl
    ? `<p style="margin:16px 0;"><a href="${imageUrl}" target="_blank" style="color:#22a559;">添付画像を開く</a><br><img src="${imageUrl}" alt="添付画像" style="max-width:100%;border-radius:8px;margin-top:8px;"></p>`
    : ''
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#22a559;padding:20px 24px;">
      <h1 style="color:white;margin:0;font-size:18px;">新しいフィードバック（${label}）</h1>
    </div>
    <div style="padding:24px;">
      <p style="white-space:pre-wrap;color:#222;font-size:15px;line-height:1.6;margin:0 0 16px;">${escapeHtml(message)}</p>
      ${img}
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
      <p style="color:#888;font-size:12px;margin:4px 0;">送信者: ${escapeHtml(fromName)}（${escapeHtml(role)}）</p>
      <p style="color:#888;font-size:12px;margin:4px 0;">メール: ${escapeHtml(email)}</p>
    </div>
  </div>
</body></html>`
}
