'use client'

import { useState } from 'react'
import { createCheckoutSession } from '@/app/actions/stripe'

// プレミアムへのアップグレード（Stripe Checkout へ遷移）
export function UpgradeButton() {
  const [loading, setLoading] = useState(false)

  const upgrade = async () => {
    setLoading(true)
    try {
      const { url } = await createCheckoutSession()
      window.location.href = url
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={upgrade}
      disabled={loading}
      className="w-full rounded-xl bg-yellow-400 py-3 font-bold text-gray-900 disabled:opacity-60 active:scale-95 transition-transform"
    >
      {loading ? '処理中...' : '★ プレミアムにアップグレード'}
    </button>
  )
}
