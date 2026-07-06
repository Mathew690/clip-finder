import { useAuth } from './context/AuthContext'
import LoginForm from './components/LoginForm'
import ClipLibrary from './components/ClipLibrary'
import './App.css'

function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="login-wrap">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">🎬 Clip Finder</span>
        <div className="header-right">
          <span className="muted">{user.email}</span>
          <button type="button" className="link-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="app-main">
        <ClipLibrary />
      </main>
    </div>
  )
}

export default App
