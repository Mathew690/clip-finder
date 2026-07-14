import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AccountModal({ user, plan, onClose }) {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const isPro = plan === 'pro'
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  async function sendReset() {
    setBusy(true)
    await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin })
    setBusy(false)
    setSent(true)
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h3>Account</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <dl className="account-rows">
          <div className="account-row">
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="account-row">
            <dt>Plan</dt>
            <dd><span className={`plan-pill ${isPro ? 'pro' : 'free'}`}>{isPro ? 'Pro' : 'Free'}</span></dd>
          </div>
          <div className="account-row">
            <dt>Member since</dt>
            <dd>{memberSince}</dd>
          </div>
        </dl>

        <div className="modal-divider" />

        <p className="modal-text">
          Need to change your password? We'll email you a secure reset link.
        </p>
        <button type="button" className="add-footage-button folder-save" onClick={sendReset} disabled={busy || sent}>
          {sent ? 'Reset email sent ✓' : busy ? 'Sending…' : 'Send password reset email'}
        </button>
      </div>
    </div>
  )
}
