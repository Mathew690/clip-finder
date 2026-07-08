import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginForm from './components/LoginForm'
import Layout from './components/Layout'
import ClipLibrary from './components/ClipLibrary'
import SearchBox from './components/SearchBox'
import SavedPage from './pages/SavedPage'
import './App.css'

function SearchPage() {
  return (
    <div>
      <h2 className="page-title">Search your footage</h2>
      <SearchBox />
    </div>
  )
}

function LibraryPage() {
  return (
    <div>
      <h2 className="page-title">Library</h2>
      <ClipLibrary />
    </div>
  )
}

function App() {
  const { user, loading } = useAuth()

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
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<SearchPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="*" element={<SearchPage />} />
      </Route>
    </Routes>
  )
}

export default App
