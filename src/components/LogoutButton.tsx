'use client'

import { signOut } from '@/app/actions/auth'

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={className ?? 'text-xs text-gray-400 underline'}>
        ログアウト
      </button>
    </form>
  )
}
