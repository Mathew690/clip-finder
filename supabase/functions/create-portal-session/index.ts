// ClipScry — opens the Stripe Customer Portal for the logged-in user so they can
// manage/cancel their subscription, update their card, and see invoices.
import Stripe from 'https://esm.sh/stripe@17?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.clipscry.com'

// Only return the caller's origin if we trust it (session/localStorage is per-origin),
// otherwise fall back to canonical — also blocks open-redirect abuse.
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
  } catch { /* not a valid URL */ }
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

    if (!profile?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'no_billing_account' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/`,
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
