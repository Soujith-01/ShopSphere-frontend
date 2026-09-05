import { useState } from 'react'
import { login, saveSession } from '../api.js'
import { useToast } from '../toast.js'
import Spinner from './Spinner.jsx'

export default function Login({ onSwitchToRegister, onAuthed }) {
  const toast = useToast()
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
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
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
