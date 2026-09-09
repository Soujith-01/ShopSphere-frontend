import { useState } from 'react'
import { login, saveSession, requestActivation } from '../api.js'
import { useToast } from '../toast.js'
import Spinner from './Spinner.jsx'

export default function Login({ onSwitchToRegister, onAuthed }) {
  const toast = useToast()
  const [pendingSeller, setPendingSeller] = useState(false) // 'pending' | 'rejected' | false
  const [deactivated, setDeactivated] = useState(null)
  const [requestSent, setRequestSent] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})

    // Show visible "required" messages instead of relying on native tooltips.
    const nextErrors = {}
    if (!email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!password) {
      nextErrors.password = 'Password is required.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    // Matches Backend/APIS/auth/auth.js login body: { email, password }
    try {
      setSubmitting(true)
      const res = await login({ email: email.trim(), password })
      saveSession(res.data.user, res.data.accessToken)
      toast.success('✅ Logged in successfully')
      onAuthed?.({ token: res.data.accessToken, user: res.data.user })
    } catch (err) {
      if (err.status === 403 && err.message?.includes('pending admin approval')) {
        setPendingSeller('pending')
      } else if (err.status === 403 && err.message?.includes('rejected')) {
        setPendingSeller('rejected')
      } else if (err.status === 403 && err.message?.includes('deactivated')) {
        setDeactivated(email.trim())
      } else {
        toast.error(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestActivation = async () => {
    if (!deactivated) return
    try {
      setRequesting(true)
      await requestActivation(deactivated)
      setRequestSent(true)
      toast.success('✅ Reactivation request sent to admin team')
    } catch (err) {
      toast.error(err.message || 'Failed to send request')
    } finally {
      setRequesting(false)
    }
  }

  if (deactivated) {
    if (requestSent) {
      return (
        <div className="card">
          <div className="card-emoji">📬</div>
          <h2>Request sent</h2>
          <p className="card-sub">
            Your reactivation request has been sent to the admin team. You'll be able to log in once an admin reviews and activates your account.
          </p>
          <ul className="pending-steps">
            <li>✅ Reactivation request sent</li>
            <li>⏳ Admin review — in progress</li>
            <li>🔒 Log in — unlocked after activation</li>
          </ul>
          <div className="card-actions">
            <button type="button" className="btn btn-secondary btn-block" onClick={() => { setDeactivated(null); setRequestSent(false) }}>
              Back to log in
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="card">
        <div className="card-emoji">🚫</div>
        <h2>Account deactivated</h2>
        <p className="card-sub">
          Your account has been deactivated by an admin. You cannot log in until your account is reactivated.
        </p>
        <ul className="pending-steps">
          <li>⛔ Account deactivated</li>
          <li>📩 Request reactivation below</li>
          <li>🔒 Log in — unlocked after activation</li>
        </ul>
        <div className="card-actions" style={{ flexDirection: 'column', gap: 10 }}>
          <button type="button" className="btn btn-primary btn-block" onClick={handleRequestActivation} disabled={requesting}>
            {requesting ? <><Spinner small /> Sending request…</> : '📩 Send reactivation request to admin'}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => setDeactivated(null)}>
            Back to log in
          </button>
        </div>
      </div>
    )
  }

  if (pendingSeller) {
    const rejected = pendingSeller === 'rejected'
    return (
      <div className="card">
        <div className="card-emoji">{rejected ? '⛔' : '⏳'}</div>
        <h2>{rejected ? 'Application rejected' : 'Approval pending'}</h2>
        <p className="card-sub">
          {rejected
            ? 'Your seller application was rejected by an admin. You cannot log in with this account. If you believe this is a mistake, contact support.'
            : "Your seller application is still awaiting admin approval. You'll be able to log in as soon as an admin approves it."}
        </p>
        <ul className="pending-steps">
          <li>✅ Registration complete</li>
          {rejected ? (
            <li>⛔ Admin review — application rejected</li>
          ) : (
            <li>⏳ Admin approval — in progress</li>
          )}
          <li>🔒 Log in — unlocked after approval</li>
        </ul>
        <div className="card-actions">
          <button type="button" className="btn btn-secondary btn-block" onClick={() => setPendingSeller(false)}>
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-emoji">🔑</div>
      <h2>Log in to ShopSphere</h2>
      <p className="card-sub">Use the email and password from your account.</p>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
            placeholder="jane@example.com"
            required
            autoComplete="email"
          />
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
            placeholder="Your password"
            required
            autoComplete="current-password"
          />
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </label>

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? <><Spinner small /> Logging in…</> : 'Log in'}
        </button>
      </form>

      <p className="card-foot">
        New to ShopSphere?{' '}
        <button type="button" className="link" onClick={onSwitchToRegister}>
          Create an account
        </button>
      </p>
    </div>
  )
}
