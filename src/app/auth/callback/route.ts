import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// メール魔法リンクのコールバック：コードをセッションに交換してロールに応じてリダイレクト
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role) {
          return NextResponse.redirect(
            new URL(profile.role === 'parent' ? '/parent' : '/study', origin)
          )
        }
        // 初回ログイン：ロール未設定 → 役割選択画面へ
        return NextResponse.redirect(new URL('/setup', origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
}
