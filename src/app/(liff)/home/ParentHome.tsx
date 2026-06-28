import Link from 'next/link'
import type { ChildData } from '@/app/actions/parent'

interface Props {
  name: string
  premium: boolean
  children: ChildData[]
}

// 親のホーム（状況の閲覧と学習導線に専念）。
// 子どもの追加・編集・削除などの管理は「せってい」に集約した。
export function ParentHome({ name, premium, children }: Props) {
  return (
    <div className="min-h-dvh bg-gray-50 pb-24">
      {/* ヘッダー */}
      <header className="px-5 pt-12 pb-2">
        <p className="text-sm text-gray-400">保護者ホーム</p>
        <h1 className="text-2xl font-bold text-gray-800">
          {name ? `${name}さん` : 'こんにちは'}
          {premium && <span className="ml-2 align-middle text-xs text-yellow-500">★ プレミアム</span>}
        </h1>
      </header>

      <div className="px-5 mt-4 flex flex-col gap-6">
        {/* 子どもの学習状況（主役） */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-500">こどもの今日の学習</h2>
          {children.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-400">まだお子さまが登録されていません。</p>
              <Link
                href="/settings"
                className="mt-3 inline-block rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform"
              >
                せっていでお子さまを追加 →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {children.map(child => (
                <div key={child.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-bold text-gray-800">
                        {child.name}
                        {child.isManaged ? (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-500">端末で管理</span>
                        ) : (
                          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-500">連携</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">累計 {child.totalLearned}語 ・ 1日 {child.dailyGoal}語</p>
                    </div>
                    {child.todaySession ? (
                      <div className="text-right">
                        {child.todaySession.completed_at ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">完了</span>
                        ) : (
                          <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">学習中</span>
                        )}
                        <p className="mt-1 text-sm font-bold text-gray-700">
                          {child.todaySession.correct_words} / {child.todaySession.total_words}語
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">今日は未開始</span>
                    )}
                  </div>

                  {!child.isManaged && (
                    <p className="mt-2 text-[11px] text-gray-400">学習は{child.name}さん自身の端末で行います</p>
                  )}

                  <div className="mt-3 flex gap-2">
                    {child.isManaged && (
                      <Link
                        href={`/study?child=${child.id}`}
                        className="flex-1 rounded-lg bg-green-500 py-2 text-center text-sm font-bold text-white active:scale-95 transition-transform"
                      >
                        学習する
                      </Link>
                    )}
                    <Link
                      href={`/progress?child=${child.id}`}
                      className="flex-1 rounded-lg bg-gray-100 py-2 text-center text-sm font-bold text-gray-700 active:scale-95 transition-transform"
                    >
                      きろく
                    </Link>
                  </div>
                </div>
              ))}

              {/* 管理は設定へ */}
              <Link
                href="/settings"
                className="text-center text-xs text-gray-400 underline"
              >
                お子さまの追加・編集はせってい
              </Link>
            </div>
          )}
        </section>

        {/* 自分で学習する */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-500">自分で学習する</h2>
          <div className="flex gap-3">
            <Link
              href="/study"
              className="flex-1 rounded-2xl bg-green-500 py-4 text-center font-bold text-white active:scale-95 transition-transform"
            >
              今日の問題を解く
            </Link>
            <Link
              href="/progress"
              className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-bold text-gray-700 shadow-sm active:scale-95 transition-transform"
            >
              きろく
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
