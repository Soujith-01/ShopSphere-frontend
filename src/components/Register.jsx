import { useState } from 'react'
import { register, saveSession } from '../api.js'
import { useToast } from '../toast.js'
import Spinner from './Spinner.jsx'

export default function Register({ onSwitchToLogin, onAuthed }) {
  const toast = useToast()
  const [pendingApproval, setPendingApproval] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
    businessName: '',
    businessType: 'individual',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const isSeller = form.role === 'seller'

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
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
    if (!form.name.trim()) {
      nextErrors.name = 'Full name is required.'
    }
    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!form.password) {
      nextErrors.password = 'Password is required.'
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }
    if (isSeller && !form.businessName.trim()) {
      nextErrors.businessName = 'Business name is required for sellers.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    // Send exactly the fields the backend register endpoint expects
    // (Backend/APIS/auth/auth.js): customers get name/email/password/role,
    // sellers additionally send businessName + businessType.
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: isSeller ? 'seller' : 'customer',
    }
    if (isSeller) {
      payload.businessName = form.businessName.trim()
      payload.businessType = form.businessType
    }

    try {
      setSubmitting(true)
      const res = await register(payload)

      // Sellers don't get a session yet — an admin must approve them first.
      if (res.data?.requiresApproval) {
        setPendingApproval(res.data.user)
        return
      }

      saveSession(res.data.user, res.data.accessToken)
      toast.success('✅ Registered successfully')
      onAuthed?.({ token: res.data.accessToken, user: res.data.user })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (pendingApproval) {
    return (
      <div className="card">
        <div className="card-emoji">⏳</div>
        <h2>Seller application sent</h2>
        <p className="card-sub">
          Thanks, {pendingApproval.name}! Your application for
          {' '}<strong>{form.businessName.trim() || 'your store'}</strong> is now
          awaiting admin approval.
        </p>
        <ul className="pending-steps">
          <li>✅ Registration complete</li>
          <li>⏳ Admin approval — in progress</li>
          <li>🔒 Log in — unlocked after approval</li>
        </ul>
        <p className="muted small">
          We'll review your application shortly. Once approved, log in with
          <strong> {pendingApproval.email}</strong> to open your seller dashboard.
        </p>
        <div className="card-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onSwitchToLogin}>
            Back to log in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-emoji">🛍️</div>
      <h2>Create your account</h2>
      <p className="card-sub">Join ShopSphere as a customer or a seller.</p>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Full name
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="Jane Doe"
            required
            autoComplete="name"
          />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
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
            value={form.password}
            onChange={set('password')}
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete="new-password"
          />
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </label>

        <label>
          I want to
          <select value={form.role} onChange={set('role')}>
            <option value="customer">Shop as a customer</option>
            <option value="seller">Sell on ShopSphere (seller)</option>
          </select>
        </label>

        {isSeller && (
          <>
            <label>
              Business name
              <input
                type="text"
                value={form.businessName}
                onChange={set('businessName')}
                placeholder="My Store Co."
                required
                autoComplete="organization"
              />
              {fieldErrors.businessName && <span className="field-error">{fieldErrors.businessName}</span>}
            </label>

            <label>
              Business type
              <select value={form.businessType} onChange={set('businessType')}>
                <option value="individual">Individual</option>
                <option value="partnership">Partnership</option>
                <option value="private_ltd">Private Ltd</option>
                <option value="llp">LLP</option>
              </select>
            </label>
          </>
        )}

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting
            ? <><Spinner small /> Creating account…</>
            : isSeller ? 'Submit seller application' : 'Create account'}
        </button>
        {isSeller && (
          <p className="muted small" style={{ marginTop: 8 }}>
            Your application will be reviewed by an admin. You can log in once it's approved.
          </p>
        )}
      </form>

      <p className="card-foot">
        Already have an account?{' '}
        <button type="button" className="link" onClick={onSwitchToLogin}>
          Log in
        </button>
      </p>
    </div>
  )
}
