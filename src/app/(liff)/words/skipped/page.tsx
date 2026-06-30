import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getKnownWords } from '@/app/actions/study'
import { KnownWordsClient } from './KnownWordsClient'

// スキップ（理解済み）にした単語の一覧。戻せる。
export default async function SkippedWordsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const words = await getKnownWords(user.id)

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="px-5 pt-12 pb-3">
        <Link href="/words" className="text-xs text-gray-400 underline">← 単語をスキップ</Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-800">スキップした単語</h1>
        <p className="text-sm text-gray-400">
          「戻す」を押すと、その単語が毎日の出題に再び含まれます。（{words.length}語）
        </p>
      </header>

      <KnownWordsClient words={words} />
    </div>
  )
}
