import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured, getSupabaseConfigError } from '../services/supabase'
import './SignIn.css'

export default function SignIn() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    if (!isSupabaseConfigured) {
      setError(getSupabaseConfigError())
      return
    }

    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="nf-signin">
      <div className="nf-signin__card">
        <div className="nf-signin__brand">
          <div className="nf-signin__mark" aria-hidden="true">
            N
          </div>
          <div>
            <p className="nf-signin__product">NexusFlow</p>
            <p className="nf-signin__org">Lumivex Nexus</p>
          </div>
        </div>

        <h1 className="nf-signin__title">Sign in to your business</h1>
        <p className="nf-signin__subtitle">
          Inventory and other live data require an authenticated owner session.
          Queries are scoped by your business through Supabase RLS.
        </p>

        <form className="nf-signin__form" onSubmit={handleSubmit}>
          <label className="nf-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="nf-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
                    </label>

<div className="nf-signin__forgot">
  <Link to="/forgot-password">Forgot password?</Link>
</div>

{error ? <p className="nf-signin__error">{error}</p> : null}
          <button type="submit" className="nf-btn nf-btn--primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
