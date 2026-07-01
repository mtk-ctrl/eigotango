import Link from 'next/link'
import type { ChildData } from '@/app/actions/parent'
import { DailyWords } from '@/components/DailyWords'
import { ReviewDailyList } from '@/components/ReviewDailyList'
import type { DailyWords as DailyWordsData, DailyWord } from '@/app/actions/study'

interface Props {
  name: string
  premium: boolean
  children: ChildData[]
  dailyWords: DailyWordsData
  reviewWords: DailyWord[]
  copyHeader: string | null
}

// 親のホーム。親が一番知りたい「今日やった？／続いてる？／何をすればいい？」を
// 各子カードの主役に置く。追加・編集などの管理は「せってい」に集約。
export function ParentHome({ name, premium, children, dailyWords, reviewWords, copyHeader }: Props) {
  const today = new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short',
  })
  const doneCount = children.filter(c => c.todaySession?.completed_at).length

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">
      {/* ヘッダー */}
      <header className="px-5 pt-12 pb-2">
        <p className="text-sm text-gray-400">{today}</p>
        <h1 className="text-2xl font-bold text-gray-800">
          {name ? `${name}さん` : 'こんにちは'}
          {premium && <span className="ml-2 align-middle text-xs text-yellow-500">★ プレミアム</span>}
        </h1>
      </header>

      <div className="px-5 mt-4 flex flex-col gap-6">
        {/* 子どもの今日の学習（主役） */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-gray-500">こどもの今日</h2>
            {children.length > 0 && (
              <span className="text-xs text-gray-400">{doneCount}/{children.length}人 完了</span>
            )}
          </div>

          {children.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-3xl">👶</p>
              <p className="mt-2 text-sm text-gray-500">お子さまを登録すると、<br />毎日の学習の様子がここに表示されます。</p>
              <Link
                href="/settings"
                className="mt-4 inline-block rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform"
              >
                お子さまを登録する →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {children.map(child => <ChildCard key={child.id} child={child} />)}
              <Link href="/settings" className="text-center text-xs text-gray-400 underline">
                お子さまの追加・編集はせってい
              </Link>
            </div>
          )}
        </section>

        {/* 自分でも学習する（副次・控えめ）。こどもカードと同じボタン配置に統一 */}
        <section>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-bold text-gray-700">自分でも学習する</p>
            <p className="text-xs text-gray-400">保護者の方も問題に挑戦できます</p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <Link
                  href="/study"
                  className="flex-1 rounded-xl bg-green-500 py-2.5 text-center text-sm font-bold text-white active:scale-95 transition-transform"
                >
                  📚 新しい単語
                </Link>
                <Link
                  href="/review"
                  className="flex-1 rounded-xl bg-blue-500 py-2.5 text-center text-sm font-bold text-white active:scale-95 transition-transform"
                >
                  🔁 復習
                </Link>
              </div>
              <Link
                href="/progress"
                className="rounded-xl bg-gray-100 py-2.5 text-center text-sm font-bold text-gray-700 active:scale-95 transition-transform"
              >
                📈 自分の学習きろくを見る
              </Link>
            </div>
          </div>
        </section>

        {/* 昨日・今日・明日の単語（自分の学習・コピー可） */}
        <section className="flex flex-col gap-4">
          <DailyWords data={dailyWords} copyHeader={copyHeader} />
          <ReviewDailyList words={reviewWords} copyHeader={copyHeader} />
        </section>
      </div>
    </div>
  )
}

function ChildCard({ child }: { child: ChildData }) {
  const session = child.todaySession
  const completed = !!session?.completed_at
  const inProgress = !!session && !completed
  const pct = session && session.total_words > 0
    ? Math.round((session.correct_words / session.total_words) * 100)
    : 0

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {/* 名前 + 連続日数 */}
      <div className="flex items-start justify-between">
        <p className="flex items-center gap-2 text-lg font-bold text-gray-800">
          {child.name}
          {!child.isManaged && (
            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-normal text-purple-500">連携</span>
          )}
        </p>
        {child.streak > 0 && (
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-500">
            🔥 {child.streak}日連続
          </span>
        )}
      </div>

      {/* 今日の状況（焦点） */}
      {completed ? (
        <div className="mt-3">
          <p className="font-bold text-green-600">✅ 今日の学習、完了！</p>
          <p className="mt-0.5 text-sm text-gray-500">{session!.correct_words}/{session!.total_words}問 正解（{pct}%）</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : inProgress ? (
        <p className="mt-3 font-bold text-blue-600">📖 学習中…</p>
      ) : (
        <div className="mt-3">
          <p className="font-bold text-amber-600">⏰ 今日はまだ未着手</p>
          <p className="mt-0.5 text-sm text-gray-500">1日の目標 {child.dailyGoal}問</p>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">累計 {child.totalLearned}語</p>

      {/* アクション（状況・種別で出し分け）。自分の学習欄と同じ配置: 新しい単語/復習を並べ、きろくは下に帯で */}
      <div className="mt-3 flex flex-col gap-2">
        {child.isManaged ? (
          <>
            <div className="flex gap-2">
              <Link
                href={`/study?child=${child.id}`}
                className="flex-1 rounded-xl bg-green-500 py-2.5 text-center text-sm font-bold text-white active:scale-95 transition-transform"
              >
                📚 新しい単語
              </Link>
              <Link
                href={`/review?child=${child.id}`}
                className="flex-1 rounded-xl bg-blue-500 py-2.5 text-center text-sm font-bold text-white active:scale-95 transition-transform"
              >
                🔁 復習
              </Link>
            </div>
            <Link
              href={`/progress?child=${child.id}`}
              className="rounded-xl bg-gray-100 py-2.5 text-center text-sm font-bold text-gray-700 active:scale-95 transition-transform"
            >
              📈 きろくを見る
            </Link>
          </>
        ) : (
          <Link
            href={`/progress?child=${child.id}`}
            className="rounded-xl bg-gray-100 py-2.5 text-center text-sm font-bold text-gray-700 active:scale-95 transition-transform"
          >
            📈 きろくを見る
          </Link>
        )}
      </div>
      {!child.isManaged && !completed && (
        <p className="mt-2 text-[11px] text-gray-400">学習は{child.name}さん自身の端末で行います。</p>
      )}
    </div>
  )
}
