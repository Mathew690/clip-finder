import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function ProfileMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const shortEmail = user.email.length > 22 ? user.email.slice(0, 10) + '…' + user.email.slice(user.email.indexOf('@')) : user.email

  return (
    <div className="profile-menu" ref={ref}>
      <button type="button" className="profile-trigger" onClick={() => setOpen(!open)}>
        {shortEmail} <span className="chevron">▾</span>
      </button>
      {open && (
        <div className="profile-dropdown">
          <p className="dropdown-email">{user.email}</p>
          <button type="button" className="dropdown-item" disabled>Account <span className="soon">soon</span></button>
          <button type="button" className="dropdown-item" disabled>Billing <span className="soon">soon</span></button>
          <button type="button" className="dropdown-item danger" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  )
}
