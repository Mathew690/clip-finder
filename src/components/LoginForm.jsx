import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const friendlyErrors = {
  'Invalid login credentials': 'Wrong email or password.',
  'User already registered': 'That email already has an account — try signing in instead.',
  'Password should be at least 6 characters': 'Password needs to be at least 6 characters.',
}

export default function LoginForm() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const action = mode === 'signin' ? signIn : signUp
    const { error } = await action(email, password)
    setSubmitting(false)
    if (error) setError(friendlyErrors[error.message] ?? error.message)
  }

  return (
    <div className="login-card">
      <h2 className="login-heading">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'One sec…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        type="button"
        className="link-button"
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
      >
        {mode === 'signin' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
