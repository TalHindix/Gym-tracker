import { type ReactNode } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { path: '/',        icon: '▦',  label: 'Dashboard' },
  { path: '/workout', icon: '⚡', label: 'אימון'      },
  { path: '/history', icon: '📊', label: 'היסטוריה'  },
  { path: '/plans',   icon: '📋', label: 'תוכניות'   },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()

  return (
    <div className="app-shell">
      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-text">LIFT<span>TRACK</span></div>
          <div className="logo-email">{user?.email}</div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ path, icon, label }) => {
            const active = path === '/' ? pathname === '/' : pathname.startsWith(path)
            return (
              <Link key={path} to={path} className={`nav-item ${active ? 'active' : ''}`}>
                <span className="nav-icon">{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={signOut} className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
            התנתק
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        {children}
      </main>

      {/* ── Mobile top bar ── */}
      <header className="mobile-header">
        <div className="logo-text" style={{ fontSize: 22 }}>LIFT<span>TRACK</span></div>
        <button onClick={signOut} className="btn btn-ghost btn-sm">יציאה</button>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav">
        {NAV.map(({ path, icon, label }) => {
          const active = path === '/' ? pathname === '/' : pathname.startsWith(path)
          return (
            <Link key={path} to={path} className={`mobile-nav-item ${active ? 'active' : ''}`}>
              <span className="mobile-nav-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
