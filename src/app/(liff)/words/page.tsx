import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUpcomingWords } from '@/app/actions/study'
import { WordsSkipClient } from './WordsSkipClient'

// 今後学ぶ予定の語を一覧表示し、理解済みをチェックでスキップする。
export default async function WordsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const words = await getUpcomingWords(100, user.id)

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="px-5 pt-12 pb-3">
        <Link href="/settings" className="text-xs text-gray-400 underline">← せってい</Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-800">単語をスキップ</h1>
        <p className="text-sm text-gray-400">
          すでに理解している単語にチェックを入れると、毎日の出題から外れます（あとで戻せます）。
        </p>
      </header>

      <WordsSkipClient words={words} />
    </div>
  )
}
