import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUpcomingWords, getKnownWordsCount } from '@/app/actions/study'
import { WordsSkipClient } from './WordsSkipClient'

// 今後学ぶ予定の語を一覧表示し、理解済みをチェックで即スキップする。
export default async function WordsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [words, knownCount] = await Promise.all([
    getUpcomingWords(120, user.id),
    getKnownWordsCount(user.id),
  ])

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="px-5 pt-12 pb-3">
        <Link href="/settings" className="text-xs text-gray-400 underline">← せってい</Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-800">単語をスキップ</h1>
        <p className="text-sm text-gray-400">
          知っている単語をタップすると、その場で出題から外れて次の単語が補充されます。
        </p>
        <Link
          href="/words/skipped"
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm active:scale-95 transition-transform"
        >
          🗂 スキップした単語（{knownCount}）→
        </Link>
      </header>

      <WordsSkipClient words={words} />
    </div>
  )
}
