'use server'

import Stripe from 'stripe'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Stripe Checkout セッションを作成してURLを返す
export async function createCheckoutSession(): Promise<{ url: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()

  // 既存の Stripe customer ID を取得
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('parent_id', user.id)
    .single()

  let customerId = sub?.stripe_customer_id

  if (!customerId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('line_display_name, display_name')
      .eq('id', user.id)
      .single()

    const customer = await stripe.customers.create({
      name: profile?.line_display_name ?? profile?.display_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    // subscriptions レコードを初期化
    await admin.from('subscriptions').upsert(
      { parent_id: user.id, stripe_customer_id: customerId, plan: 'free', status: 'active' },
      { onConflict: 'parent_id' }
    )
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent?upgraded=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent`,
  })

  if (!session.url) throw new Error('Checkout URL not found')
  return { url: session.url }
}

// サブスクリプションをキャンセル
export async function cancelSubscription(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('parent_id', user.id)
    .single()

  if (sub?.stripe_subscription_id) {
    await stripe.subscriptions.cancel(sub.stripe_subscription_id)
  }
}
