import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentDailyMax } from '@/app/actions/study'
import { getChildrenData } from '@/app/actions/parent'
import { displayNameOf } from '@/lib/profile'
import { SelfGoalSetting } from '@/components/SelfGoalSetting'
import { CopyHeaderSetting } from '@/components/CopyHeaderSetting'
import { BottomNav } from '@/components/BottomNav'
import { LogoutButton } from '@/components/LogoutButton'
import { SettingsClient } from './SettingsClient'
import { ChildrenManager } from './ChildrenManager'
import { FeedbackForm } from './FeedbackForm'
import { UpgradeButton } from './UpgradeButton'
import type { NotificationChannel } from '@/types/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, line_display_name, email, daily_goal, new_per_day, copy_header, daily_goal_locked, notification_channel, line_user_id')
    .eq('id', user.id)
    .single()

  const isParent = profile?.role === 'parent'
  const max = await getStudentDailyMax(user.id)
  const premium = max > 20
  const displayName = displayNameOf(profile)
  const children = isParent ? await getChildrenData() : []

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">
      {/* ヘッダー */}
      <header className="px-5 pt-12 pb-2">
        <h1 className="text-2xl font-bold text-gray-800">せってい</h1>
        <p className="text-sm text-gray-400">{isParent ? 'お子さまの管理・各種設定' : '各種設定'}</p>
      </header>

      <div className="px-5 mt-4 flex flex-col gap-4">
        {/* こども管理（親のみ）: 追加・編集・連携・削除 */}
        {isParent && <ChildrenManager children={children} premium={premium} />}

        {/* 知っている単語をスキップ */}
        <Link
          href="/words"
          className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm active:scale-[0.99] transition-transform"
        >
          <div>
            <h2 className="text-sm font-bold text-gray-700">✅ 知っている単語をスキップ</h2>
            <p className="mt-0.5 text-xs text-gray-400">理解済みの語を毎日の出題から外す</p>
          </div>
          <span className="text-gray-300">›</span>
        </Link>

        {/* 学習量（新規／復習を別々に。親がロック中は読み取り専用） */}
        <SelfGoalSetting
          kind="new"
          current={profile?.new_per_day ?? 3}
          locked={profile?.daily_goal_locked ?? false}
          max={max}
        />
        <SelfGoalSetting
          kind="review"
          current={profile?.daily_goal ?? 10}
          locked={profile?.daily_goal_locked ?? false}
          max={max}
        />

        {/* 単語リストのコピー時に付ける見出し */}
        <CopyHeaderSetting current={profile?.copy_header ?? null} />

        {/* 通知方法・アカウント（クライアント） */}
        <SettingsClient
          displayName={displayName}
          email={profile?.email ?? null}
          channel={(profile?.notification_channel as NotificationChannel) ?? 'email'}
          lineLinked={!!profile?.line_user_id}
        />

        {/* プラン */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-bold text-gray-700">プラン</h2>
          {premium ? (
            <div className="flex items-center gap-2">
              <span className="text-xl text-yellow-500">★</span>
              <p className="font-bold text-gray-800">プレミアムプラン</p>
            </div>
          ) : isParent ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-600">
                無料プランは1日20語まで。<br />プレミアムで最大100語＋高校受験の全語彙が使えます。
              </p>
              <UpgradeButton />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">無料プラン</span>
              <span className="text-[11px] text-gray-400">プランは保護者が管理します</span>
            </div>
          )}
        </div>

        {/* ご意見・不具合の報告 */}
        <FeedbackForm />

        {/* ログアウト */}
        <div className="flex justify-center pt-2">
          <LogoutButton className="text-sm text-gray-400 underline" />
        </div>
      </div>

      <BottomNav role={isParent ? 'parent' : 'student'} />
    </div>
  )
}
