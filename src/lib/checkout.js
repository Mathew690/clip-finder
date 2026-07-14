import { supabase } from './supabase'

export async function startCheckout() {
  // Pass our current origin so Stripe returns us to the SAME origin our session
  // lives in — otherwise we come back logged out (localStorage is per-origin).
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { origin: window.location.origin },
  })
  if (error) {
    alert('Could not start checkout: ' + error.message)
    return
  }
  if (data?.url) window.location.href = data.url
}
