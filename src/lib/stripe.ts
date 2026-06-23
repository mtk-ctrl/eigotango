import Stripe from 'stripe'

let _stripe: Stripe | null = null

// Stripe クライアントを遅延初期化する。
// モジュール読み込み時に new しないことで、ビルド時（STRIPE_SECRET_KEY 未設定）でも落ちない。
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return _stripe
}
