import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ProfileMenu from './ProfileMenu'
import AddFootage from './AddFootage'
import Brand from './Brand'

export default function Layout() {
  const { refreshPlan } = useAuth()
  const [showUpgraded, setShowUpgraded] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') === '1') {
      setShowUpgraded(true)
      window.history.replaceState({}, '', '/')
      // the webhook may take a moment — refresh the plan a few times
      let tries = 0
      const iv = setInterval(() => {
        refreshPlan()
        if (++tries >= 5) clearInterval(iv)
      }, 2000)
      return () => clearInterval(iv)
    }
  }, [])

  return (
    <div className="app-shell">
      {showUpgraded && (
        <div className="upgraded-banner">
          🎉 You're on ClipScry Pro now — thank you! Enjoy 100 hours a month and clip export.
          <button type="button" onClick={() => setShowUpgraded(false)}>✕</button>
        </div>
      )}
      <header className="app-header">
        <div className="header-left">
          <NavLink to="/" className="app-title"><Brand /></NavLink>
          <nav className="main-nav">
            <NavLink to="/" end>Search</NavLink>
            <NavLink to="/library">Library</NavLink>
            <NavLink to="/saved">Saved</NavLink>
            <NavLink to="/roadmap">Roadmap</NavLink>
          </nav>
        </div>
        <div className="header-right">
          <AddFootage />
          <ProfileMenu />
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
