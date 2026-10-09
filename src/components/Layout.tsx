import { NavLink, Outlet } from 'react-router-dom'
import { forceDemo, isEmbed, OWNER_NAME, PORTFOLIO_URL, supabaseConfigured } from '../lib/config'
import { useMode } from '../lib/modeContext'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme'
import { MoonIcon, SunIcon } from './Icons'

export function Layout() {
  const [theme, setTheme] = useTheme()
  const { session } = useMode()
  const isDark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="brand" aria-label="SiteScout home">
            <img src="/favicon.svg" alt="" />
            <span>SiteScout</span>
          </NavLink>
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>
              Search
            </NavLink>
            <NavLink to="/tracker">Tracker</NavLink>
            {supabaseConfigured && !forceDemo &&
              (session ? (
                <button type="button" className="btn btn-ghost btn-sm nav-btn" onClick={() => supabase?.auth.signOut()}>
                  Log out
                </button>
              ) : (
                <NavLink to="/login">Log in</NavLink>
              ))}
            <button
              type="button"
              className="btn btn-ghost icon-btn"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Light theme' : 'Dark theme'}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </nav>
        </div>
      </header>
      <main>
        <div className="container">
          <Outlet />
        </div>
      </main>
      {!isEmbed && (
        <footer className="footer">
          <div className="container row">
            <span>
              Built by <a href={PORTFOLIO_URL}>{OWNER_NAME}</a> · Official APIs only (Google Places, 2GIS)
            </span>
          </div>
        </footer>
      )}
    </div>
  )
}
