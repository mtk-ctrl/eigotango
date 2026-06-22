import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server Component / Route Handler / Server Action 用クライアント
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component からの呼び出し時はセット不可（無視してよい）
          }
        },
      },
    }
  )
}

// Service Role（管理者権限）クライアント - Edge Function / Webhook 専用
// RLS をバイパスするため、クライアントサイドには絶対に渡さない
export function createAdminClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
