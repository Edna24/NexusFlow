
import { useState } from 'react'
import { requireSupabase } from '../services/supabase'
import './SignIn.css'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const client = requireSupabase()
      const { error } = await client.auth.updateUser({ password })

      if (error) throw error

      setMessage(
        'Your password has been updated successfully. You can now sign in.'
      )

      await client.auth.signOut()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update password.'
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

        <h1 className="nf-signin__title">Create a new password</h1>

        <p className="nf-signin__subtitle">
          Choose a new password for your NexusFlow account.
        </p>

        <form className="nf-signin__form" onSubmit={handleSubmit}>
          <label className="nf-field">
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label className="nf-field">
            <span>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
