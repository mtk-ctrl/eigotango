import Link from 'next/link'
import { DailyWords } from '@/components/DailyWords'
import type { DailyWords as DailyWordsData } from '@/app/actions/study'

interface Props {
  name: string
  premium: boolean
  review: { due: number; overdue: number; newRemaining: number; dailyGoal: number }
  dailyWords: DailyWordsData
}

// 生徒（本人学習）のホーム。今日の学習を最も目立つ1アクションに。
export function StudentHome({ name, premium, review, dailyWords }: Props) {
  const { due, overdue, newRemaining, dailyGoal } = review
  const hasWork = due > 0 || newRemaining > 0

  // ヒーローの状態（完了 / 復習がたまっている / 通常）
  const heroSub =
    overdue > 0
      ? `復習が${overdue}語たまっています`
      : due > 0
        ? `今日の復習が${due}語あります`
        : '新しい単語に挑戦しよう'

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
        {/* 今日の学習（主役） */}
        {hasWork ? (
          <Link
            href="/study"
            className={`block rounded-3xl p-6 shadow-sm active:scale-[0.99] transition-transform ${
              overdue > 0 ? 'bg-orange-500' : 'bg-green-500'
            } text-white`}
          >
            <p className="text-sm/relaxed opacity-90">{overdue > 0 ? '⏰ 解き忘れあり' : '📚 今日の学習'}</p>
            <p className="text-2xl font-bold mt-1">{heroSub}</p>
            <span className="inline-flex items-center gap-1 mt-4 rounded-full bg-white/20 px-4 py-2 text-sm font-bold">
              はじめる →
            </span>
          </Link>
        ) : (
          <div className="rounded-3xl bg-white p-6 shadow-sm text-center">
            <p className="text-5xl">🌟</p>
            <p className="mt-2 text-lg font-bold text-gray-800">今日の学習は完了！</p>
            <p className="mt-1 text-sm text-gray-500">また明日チャレンジしよう</p>
          </div>
        )}

        {/* ミニ情報 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{dailyGoal}<span className="text-sm font-normal text-gray-400">問</span></p>
            <p className="mt-0.5 text-xs text-gray-400">1日の目標</p>
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

        {/* 昨日・今日・明日の単語（コピー可） */}
        <DailyWords data={dailyWords} />
      </main>
    </div>
  )
}
