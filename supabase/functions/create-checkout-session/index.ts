// ClipScry — creates a Stripe Checkout Session for the ClipScry Pro subscription.
// Called from the app (authenticated). Returns a URL the app redirects the user to.
import Stripe from 'https://esm.sh/stripe@17?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.clipscry.com'

// Return the caller's origin ONLY if we trust it, so the user lands back on the
// same origin their session lives in (localStorage is per-origin). Anything else
// falls back to the canonical site — this also stops open-redirect abuse.
function resolveOrigin(raw: unknown): string {
  if (typeof raw !== 'string') return SITE_URL
  try {
    const u = new URL(raw)
    const host = u.hostname
    const trusted =
      host === 'www.clipscry.com' ||
      host === 'clipscry.com' ||
      host === 'localhost' ||
      (host.endsWith('.vercel.app') && host.startsWith('clip-finder'))
    if (trusted && (u.protocol === 'https:' || host === 'localhost')) return u.origin
  } catch { /* not a valid URL — fall through */ }
  return SITE_URL
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    let body: { origin?: string } = {}
    try { body = await req.json() } catch { /* empty body is fine */ }
    const origin = resolveOrigin(body.origin)

    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'not authenticated' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: profile } = await admin
      .from('profiles').select('stripe_customer_id').eq('id', user.id).single()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email, metadata: { user_id: user.id },
      })
      customerId = customer.id
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${origin}/?upgraded=1`,
      cancel_url: `${origin}/`,
      metadata: { user_id: user.id },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
