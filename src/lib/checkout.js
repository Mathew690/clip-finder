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

export async function startBillingPortal() {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: { origin: window.location.origin },
  })
  if (error) {
    // functions.invoke surfaces non-2xx as an error; the body still carries our code
    const code = error.context ? (await error.context.json().catch(() => ({}))).error : null
    if (code === 'no_billing_account') {
      alert("You don't have a billing account yet — upgrade to Pro first.")
    } else {
      alert('Could not open billing: ' + error.message)
    }
    return
  }
  if (data?.url) window.location.href = data.url
}
