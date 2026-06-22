import { createBrowserClient } from '@supabase/ssr'

// ブラウザ（Client Component）用 Supabase クライアント
// 呼ぶたびに新しいインスタンスを返す（@supabase/ssr の推奨パターン）
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
