'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const CATEGORIES = ['bug', 'request', 'other'] as const
type Category = (typeof CATEGORIES)[number]

// フィードバック（不具合報告・改善要望）を受け取り feedback テーブルに保存する。
// オーナーへの通知は per-submission ではなく日次ダイジェスト（/api/cron/feedback-digest）。
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
  let imagePath: string | null = null
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
    imagePath = path
    imageUrl = admin.storage.from('feedback').getPublicUrl(path).data.publicUrl
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role, email')
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
  if (insErr) {
    // 保存に失敗したらアップロード済み画像を消して孤立を防ぐ
    if (imagePath) await admin.storage.from('feedback').remove([imagePath]).catch(() => {})
    throw new Error('送信に失敗しました。時間をおいて再試行してください。')
  }

  return { ok: true }
}
