import Link from 'next/link'
import { DailyWords } from '@/components/DailyWords'
import { ReviewDailyList } from '@/components/ReviewDailyList'
import type { DailyWords as DailyWordsData, DailyWord } from '@/app/actions/study'

interface Props {
  name: string
  premium: boolean
  review: { due: number; overdue: number; newRemaining: number; reviewLimit: number; newPerDay: number }
  dailyWords: DailyWordsData
  reviewWords: DailyWord[]
  copyHeader: string | null
}

// 生徒（本人学習）のホーム。「新しい単語」と「復習(アクティブリコール)」を別アクションで提示。
export function StudentHome({ name, premium, review, dailyWords, reviewWords, copyHeader }: Props) {
  const { due, overdue, newRemaining, reviewLimit, newPerDay } = review

  const newToday = newPerDay > 0 ? Math.min(newPerDay, newRemaining) : 0
  const reviewToday = Math.min(reviewLimit, due)
  const allDone = newToday === 0 && reviewToday === 0

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">
      {/* ヘッダー */}
      <header className="px-5 pt-12 pb-2">
        <p className="text-sm text-gray-400">こんにちは</p>
        <h1 className="text-2xl font-bold text-gray-800">
          {name ? `${name}さん` : 'ようこそ'}
          {premium && <span className="ml-2 align-middle text-xs text-yellow-500">★ プレミアム</span>}
        </h1>
      </header>

      <main className="px-5 mt-4 flex flex-col gap-4">
        {allDone ? (
          <div className="rounded-3xl bg-white p-6 shadow-sm text-center">
            <p className="text-5xl">🌟</p>
            <p className="mt-2 text-lg font-bold text-gray-800">今日のぶんは完了！</p>
            <p className="mt-1 text-sm text-gray-500">また明日チャレンジしよう</p>
          </div>
        ) : (
          <>
            {/* 復習（アクティブリコール）— 期限の来た語を優先 */}
            {reviewToday > 0 && (
              <Link
                href="/review"
                className={`block rounded-3xl p-6 shadow-sm active:scale-[0.99] transition-transform text-white ${
                  overdue > 0 ? 'bg-orange-500' : 'bg-blue-500'
                }`}
              >
                <p className="text-sm/relaxed opacity-90">{overdue > 0 ? '⏰ 解き忘れあり' : '🔁 復習（覚え直し）'}</p>
                <p className="text-2xl font-bold mt-1">
                  復習が{reviewToday}語
                  {due > reviewToday && <span className="text-base font-normal opacity-90">（待ち {due}語）</span>}
                </p>
                <span className="inline-flex items-center gap-1 mt-4 rounded-full bg-white/20 px-4 py-2 text-sm font-bold">
                  復習する →
                </span>
              </Link>
            )}

            {/* 新しい単語 */}
            {newToday > 0 && (
              <Link
                href="/study"
                className="block rounded-3xl p-6 shadow-sm active:scale-[0.99] transition-transform bg-green-500 text-white"
              >
                <p className="text-sm/relaxed opacity-90">📚 新しい単語</p>
                <p className="text-2xl font-bold mt-1">今日は{newToday}語</p>
                <span className="inline-flex items-center gap-1 mt-4 rounded-full bg-white/20 px-4 py-2 text-sm font-bold">
                  はじめる →
                </span>
              </Link>
            )}
          </>
        )}

        {/* ミニ情報 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{newPerDay}<span className="text-sm font-normal text-gray-400">語</span></p>
            <p className="mt-0.5 text-xs text-gray-400">新しい単語/日</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{due}<span className="text-sm font-normal text-gray-400">語</span></p>
            <p className="mt-0.5 text-xs text-gray-400">復習待ち</p>
          </div>
        </div>

        {/* 記録への導線 */}
        <Link
          href="/progress"
          className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between active:scale-[0.99] transition-transform"
        >
          <span className="font-bold text-gray-700">📈 学習の記録を見る</span>
          <span className="text-gray-300">›</span>
        </Link>

        {/* 新しい単語（昨日・今日・明日／コピー可） */}
        <DailyWords data={dailyWords} copyHeader={copyHeader} />

        {/* 復習する単語（コピー可） */}
        <ReviewDailyList words={reviewWords} copyHeader={copyHeader} />
      </main>
    </div>
  )
}
