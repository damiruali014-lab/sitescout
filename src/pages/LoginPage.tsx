import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMode } from '../lib/modeContext'
import { supabase } from '../lib/supabase'

/** Single-user login (create your user in Supabase → Authentication → Users, and disable sign-ups). */
export function LoginPage() {
  const { session } = useMode()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>()

  if (!supabase)
    return (
      <div className="card narrow stack-sm">
        <h1>Log in</h1>
        <p className="muted">This deployment has no Supabase configured, so it runs in Demo mode only.</p>
        <Link to="/">Try the demo →</Link>
      </div>
    )

  if (session)
    return (
      <div className="card narrow stack-sm">
        <h1>You're logged in</h1>
        <p className="muted">{session.user.email}</p>
        <div className="row">
          <Link className="btn btn-primary" to="/">
            Go to search
          </Link>
          <button type="button" className="btn" onClick={() => supabase!.auth.signOut()}>
            Log out
          </button>
        </div>
      </div>
    )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(undefined)
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setErr(error.message)
    else navigate('/tracker')
  }

  return (
    <form className="card narrow stack-sm" onSubmit={onSubmit}>
      <h1>Log in</h1>
      <p className="muted small">Live mode and the tracker are private. Visitors can use Demo mode without an account.</p>
      <div className="field">
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </div>
      <div className="field">
        <label className="label" htmlFor="password">
          Password
        </label>
        <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      {err && <p className="banner banner-error small">{err}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy && <span className="spinner" />} Log in
      </button>
    </form>
  )
}
