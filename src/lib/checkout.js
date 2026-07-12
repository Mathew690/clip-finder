import { supabase } from './supabase'

export async function startCheckout() {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: {} })
  if (error) {
    alert('Could not start checkout: ' + error.message)
    return
  }
  if (data?.url) window.location.href = data.url
}
