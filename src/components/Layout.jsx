import { NavLink, Outlet } from 'react-router-dom'
import ProfileMenu from './ProfileMenu'
import AddFootage from './AddFootage'

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <NavLink to="/" className="app-title">🔮 ClipScry</NavLink>
          <nav className="main-nav">
            <NavLink to="/" end>Search</NavLink>
            <NavLink to="/library">Library</NavLink>
            <NavLink to="/saved">Saved</NavLink>
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
