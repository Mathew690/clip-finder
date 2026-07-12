// ClipScry — receives Stripe events and flips a user's plan to pro/free.
// Deployed with --no-verify-jwt (Stripe calls it without a Supabase token).
// Security comes from verifying the Stripe signature instead.
import Stripe from 'https://esm.sh/stripe@17?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function setPlan(customerId: string, plan: string, subId: string | null, status: string) {
  await admin.from('profiles').update({
    plan,
    stripe_subscription_id: subId,
    subscription_status: status,
    updated_at: new Date().toISOString(),
  }).eq('stripe_customer_id', customerId)
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret)
  } catch (e) {
    return new Response(`Signature verification failed: ${e}`, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session
      await setPlan(String(s.customer), 'pro', String(s.subscription), 'active')
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub = event.data.object as Stripe.Subscription
      const active = sub.status === 'active' || sub.status === 'trialing'
      await setPlan(String(sub.customer), active ? 'pro' : 'free', sub.id, sub.status)
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      await setPlan(String(sub.customer), 'free', sub.id, 'canceled')
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (e) {
    return new Response(`Handler error: ${e}`, { status: 500 })
  }
})
