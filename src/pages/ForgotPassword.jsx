
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requireSupabase } from '../services/supabase'
import './SignIn.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      const client = requireSupabase()

      const { error } = await client.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (error) throw error

      setMessage(
        'If an account exists for this email, a password reset link will be sent. Check your inbox.'
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to request a password reset.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="nf-signin">
      <div className="nf-signin__card">
        <div className="nf-signin__brand">
          <div className="nf-signin__mark">N</div>
          <div>
            <p className="nf-signin__product">NexusFlow</p>
            <p className="nf-signin__org">Lumivex Nexus</p>
          </div>
        </div>

        <h1 className="nf-signin__title">Forgot your password?</h1>
        <p className="nf-signin__subtitle">
          Enter your account email and we'll send you a password reset link.
        </p>

        <form className="nf-signin__form" onSubmit={handleSubmit}>
          <label className="nf-field">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          {error && <p className="nf-signin__error">{error}</p>}
          {message && <p>{message}</p>}

          <button
            type="submit"
            className="nf-btn nf-btn--primary"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p>
          <Link to="/">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
